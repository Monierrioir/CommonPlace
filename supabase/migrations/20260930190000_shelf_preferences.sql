-- Commonplace: how each reader's bookshelf looks (Living Bookshelf customization v1).
--
-- Apply once, in the Supabase SQL Editor (paste the whole file and run) or with
-- `supabase db push` from a linked CLI. It runs in a single transaction, so a
-- failure leaves the database unchanged. Requires the initial migration
-- (20260929120000_initial_profiles_books_library.sql) for public.set_updated_at().
-- It does not depend on the draft 20260930180000 themes/place migration.
--
-- Only creates new objects: profiles, books, user_library and book_reflections
-- are neither read nor modified.
--
-- Design:
--   * One row per reader, keyed by user_id. No row means "the default shelf";
--     defaults live in application code, so nothing here is required to render
--     the library and the columns deliberately have no defaults.
--   * Purely cosmetic and kept apart from the collection: removing every book
--     leaves the shelf as it was, and changing the shelf never touches a book.
--   * Every value is a known preset id. Nothing is ever interpreted as CSS, a
--     colour or a URL; the app maps ids to its own styles.
--   * decorations is an array of { "slot": ..., "item": ... } placements on the
--     predetermined slots of the bookcase:
--       top-left, top-center, top-right   standing on top of the bookcase
--       row-start, row-middle, row-end    standing among the books, in the flow
--     Each slot holds at most one object, each object is placed at most once,
--     and an object may only use the slots it was designed for. The framed print
--     is wide: placed at top-left or top-right it also takes up top-center.
--   * Adding a preset or object later means replacing the matching check or
--     shelf_decorations_valid() in a new migration, alongside the app catalogue.
--   * Row Level Security and column privileges follow the earlier migrations:
--     ownership comes from auth.uid(), user_id and timestamps are not client-
--     updatable, and the anon role has no access.

begin;

create or replace function public.shelf_decorations_valid(decorations jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  placement jsonb;
  slots text[] := '{}';
  items text[] := '{}';
begin
  if decorations is null or jsonb_typeof(decorations) <> 'array' or jsonb_array_length(decorations) > 6 then
    return false;
  end if;

  for placement in select value from jsonb_array_elements(decorations) loop
    if jsonb_typeof(placement) <> 'object'
      or (select count(*) from jsonb_object_keys(placement)) <> 2
      or jsonb_typeof(placement -> 'slot') is distinct from 'string'
      or jsonb_typeof(placement -> 'item') is distinct from 'string'
    then
      return false;
    end if;

    if not exists (
      select 1
      from (values
        ('glazed-bookend', 'row-start'), ('glazed-bookend', 'row-middle'), ('glazed-bookend', 'row-end'),
        ('potted-plant', 'row-start'), ('potted-plant', 'row-middle'), ('potted-plant', 'row-end'),
        ('potted-plant', 'top-left'), ('potted-plant', 'top-center'), ('potted-plant', 'top-right'),
        ('trailing-plant', 'top-left'), ('trailing-plant', 'top-right'),
        ('candle', 'row-start'), ('candle', 'row-middle'), ('candle', 'row-end'),
        ('candle', 'top-left'), ('candle', 'top-center'), ('candle', 'top-right'),
        ('ceramic-vase', 'row-start'), ('ceramic-vase', 'row-middle'), ('ceramic-vase', 'row-end'),
        ('ceramic-vase', 'top-left'), ('ceramic-vase', 'top-center'), ('ceramic-vase', 'top-right'),
        ('framed-print', 'top-left'), ('framed-print', 'top-right'),
        ('paper-stack', 'row-start'), ('paper-stack', 'row-middle'), ('paper-stack', 'row-end'),
        ('paper-stack', 'top-left'), ('paper-stack', 'top-center'), ('paper-stack', 'top-right')
      ) as allowed (item, slot)
      where allowed.item = placement ->> 'item' and allowed.slot = placement ->> 'slot'
    ) then
      return false;
    end if;

    if (placement ->> 'slot') = any (slots) or (placement ->> 'item') = any (items) then
      return false;
    end if;
    slots := slots || (placement ->> 'slot');
    items := items || (placement ->> 'item');
  end loop;

  -- The wide framed print covers top-center from either corner.
  if 'top-center' = any (slots) and exists (
    select 1 from jsonb_array_elements(decorations) as d (value)
    where d.value ->> 'item' = 'framed-print'
  ) then
    return false;
  end if;

  return true;
end;
$$;

create table public.shelf_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shelf_style text not null,
  wall_style text not null,
  lighting_style text not null,
  decorations jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint shelf_preferences_shelf_style_known check (
    shelf_style in ('warm-oak', 'dark-walnut', 'honey-pine', 'painted-cream')
  ),
  constraint shelf_preferences_wall_style_known check (
    wall_style in ('warm-paper', 'soft-sage', 'dusty-blue', 'faded-rose')
  ),
  constraint shelf_preferences_lighting_style_known check (
    lighting_style in ('daylight', 'golden-evening', 'soft-night')
  ),
  constraint shelf_preferences_decorations_valid check (public.shelf_decorations_valid(decorations))
);

create trigger shelf_preferences_set_updated_at
  before update on public.shelf_preferences
  for each row execute function public.set_updated_at();

alter table public.shelf_preferences enable row level security;

create policy "Users can read their own shelf"
  on public.shelf_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own shelf"
  on public.shelf_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own shelf"
  on public.shelf_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- "Restore the default shelf" removes the row.
create policy "Users can reset their own shelf"
  on public.shelf_preferences for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.shelf_preferences from anon, authenticated;
grant select, delete on table public.shelf_preferences to authenticated;
grant insert (user_id, shelf_style, wall_style, lighting_style, decorations)
  on table public.shelf_preferences to authenticated;
-- A shelf never changes owner.
grant update (shelf_style, wall_style, lighting_style, decorations)
  on table public.shelf_preferences to authenticated;

commit;
