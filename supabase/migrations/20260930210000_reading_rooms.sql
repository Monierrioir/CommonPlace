-- Commonplace: the Living Reading Room (room surfaces, bookcase and placed items).
--
-- Apply once, in the Supabase SQL Editor (paste the whole file and run) or with
-- `supabase db push` from a linked CLI. It runs in a single transaction, so a
-- failure leaves the database unchanged. Requires the initial migration
-- (20260929120000_initial_profiles_books_library.sql) for public.set_updated_at()
-- and the shelf migrations (20260930190000, 20260930200000). It does not depend
-- on the draft 20260930180000 themes/place migration.
--
-- Only creates new objects. profiles, books, user_library, book_reflections and
-- shelf_preferences are neither read nor modified (shelf_preferences only gains a
-- comment). The released app keeps working exactly as before: it never touches
-- these tables.
--
-- Design:
--   * reading_rooms: one row per room. A reader has at most one active room (the
--     one shown in their library); saved rooms later are simply more rows with
--     is_active = false. Room-wide surfaces are columns: wall, floor, bookcase
--     model, bookcase material and ambience (the Daylight / Golden Evening / Soft
--     Night light). Each is a known preset id.
--   * reading_room_items: everything placed in a room, one row per placement:
--     windows (architecture), the rug, furniture, light fixtures and objects,
--     including the objects on the bookcase. A placement names a semantic zone of
--     the room composition, never coordinates:
--       wall-left, wall-right, ceiling
--       bookcase-top-left/-center/-right, bookcase-row-start/-middle/-end,
--       bookcase-trim (lights following the bookcase outline)
--       rug (floor layer)
--       corner-left, corner-right, mid-left, mid-center, mid-right,
--       front-left, front-center, front-right
--       table-left, table-center, table-right (on a table standing below them)
--     Furniture carries a finish (an upholstery or wood preset); fixtures carry a
--     light tone preset and an on/off state. Nothing is a colour, CSS or a URL.
--   * Rules, mirrored by lib/room/catalogue.ts:
--       - each item is one the app knows, of its kind, in a zone designed for it;
--       - one item per zone and each item once per room (unique constraints);
--       - wide items also cover a neighbouring zone (the framed print covers
--         bookcase-top-center from a top corner; a sofa, chaise or desk at
--         mid-left/right covers the corner behind it);
--       - a tabletop zone needs a table beneath it.
--     The last two span rows, so a deferred constraint trigger checks the whole
--     room at the end of each transaction.
--   * save_reading_room() writes the active room and its items atomically, as
--     the calling reader (security invoker: RLS still applies). The reader comes
--     from auth.uid(); the payload has no user id.
--   * shelf_preferences becomes the predecessor. Nothing is copied here: the app
--     reads a reader's active room, falls back to their saved shelf, then to the
--     defaults, and the first room save creates the row. So a shelf saved between
--     this migration and the room UI rollout is never lost or overwritten.
--   * Book layout (manual positions, stacks, orientation) is deliberately not here.
--     It will get its own table keyed by room and library entry.
--   * Adding a preset or item later means replacing the matching check or
--     function in a new migration, alongside the app catalogue.
--   * Row Level Security and column privileges follow the earlier migrations:
--     ownership comes from auth.uid(), user_id and timestamps are not client-
--     updatable, and the anon role has no access.

begin;

-- ---------------------------------------------------------------------------
-- Catalogue rules
-- ---------------------------------------------------------------------------

-- The zones an item may use, or null for an item this version does not know.
create or replace function public.reading_room_item_zones(p_kind text, p_item text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when p_kind = 'architecture' and p_item in ('tall-window', 'reading-window', 'rain-window')
      then array['wall-left', 'wall-right']
    when p_kind = 'rug' and p_item in ('vintage-medallion', 'muted-kilim', 'faded-floral', 'woven-neutral', 'dark-library')
      then array['rug']
    when p_kind = 'furniture' and p_item in ('classic-armchair', 'velvet-armchair')
      then array['corner-left', 'corner-right', 'mid-left', 'mid-right']
    when p_kind = 'furniture' and p_item in ('small-sofa', 'chaise', 'round-side-table', 'writing-desk')
      then array['mid-left', 'mid-right']
    when p_kind = 'furniture' and p_item in ('reading-bench', 'coffee-table')
      then array['mid-center', 'front-center']
    when p_kind = 'furniture' and p_item = 'writing-chair'
      then array['front-left', 'front-right']
    when p_kind = 'fixture' and p_item = 'brass-floor-lamp'
      then array['corner-left', 'corner-right', 'front-left', 'front-right']
    when p_kind = 'fixture' and p_item = 'ceramic-table-lamp'
      then array['table-left', 'table-center', 'table-right']
    when p_kind = 'fixture' and p_item = 'library-sconce'
      then array['wall-left', 'wall-right']
    when p_kind = 'fixture' and p_item = 'pendant-light'
      then array['ceiling']
    when p_kind = 'fixture' and p_item = 'string-lights'
      then array['bookcase-trim']
    when (p_kind = 'fixture' and p_item = 'candle')
      or (p_kind = 'object' and p_item in (
        'potted-plant', 'succulent', 'dried-flowers', 'ceramic-vase', 'paper-stack',
        'ceramic-figure', 'small-sculpture', 'decorative-box', 'magnifying-glass'))
      then array['bookcase-top-left', 'bookcase-top-center', 'bookcase-top-right',
                 'bookcase-row-start', 'bookcase-row-middle', 'bookcase-row-end',
                 'table-left', 'table-center', 'table-right']
    when p_kind = 'object' and p_item in ('glazed-bookend', 'brass-bookend', 'stone-bookend')
      then array['bookcase-row-start', 'bookcase-row-middle', 'bookcase-row-end']
    when p_kind = 'object' and p_item = 'trailing-plant'
      then array['bookcase-top-left', 'bookcase-top-right']
    when p_kind = 'object' and p_item = 'fern'
      then array['bookcase-top-left', 'bookcase-top-right', 'corner-left', 'corner-right', 'front-left', 'front-right']
    when p_kind = 'object' and p_item in ('framed-print', 'framed-botanical')
      then array['bookcase-top-left', 'bookcase-top-right', 'wall-left', 'wall-right']
    when p_kind = 'object' and p_item = 'abstract-print'
      then array['wall-left', 'wall-right']
    when p_kind = 'object' and p_item = 'globe'
      then array['bookcase-top-left', 'bookcase-top-center', 'bookcase-top-right', 'table-left', 'table-center', 'table-right']
    when p_kind = 'object' and p_item = 'analog-clock'
      then array['wall-left', 'wall-right', 'bookcase-top-left', 'bookcase-top-center', 'bookcase-top-right',
                 'table-left', 'table-center', 'table-right']
  end
$$;

-- One placement on its own: a known item of its kind in an allowed zone, with a
-- finish only for furniture (from its family) and a tone and on/off state only
-- for fixtures.
create or replace function public.reading_room_item_valid(
  p_kind text,
  p_item text,
  p_zone text,
  p_finish text,
  p_tone text,
  p_on boolean
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_zone = any (public.reading_room_item_zones(p_kind, p_item))
    and case
      when p_kind = 'furniture' then
        p_finish is not null and case
          when p_item in ('classic-armchair', 'velvet-armchair', 'small-sofa', 'chaise')
            then p_finish in ('moss', 'oxblood', 'ink-blue', 'oatmeal', 'faded-rose')
          else p_finish in ('warm-oak', 'dark-walnut', 'honey-pine', 'painted-cream')
        end
      else p_finish is null
    end
    and case
      when p_kind = 'fixture' then
        p_on is not null and p_tone is not null and case
          when p_item = 'candle' then p_tone in ('candle-amber', 'warm-gold')
          else p_tone in ('candle-amber', 'warm-gold', 'soft-ivory', 'moonlight', 'dusty-rose')
        end
      else p_tone is null and p_on is null
    end,
    false
  )
$$;

-- Zones a wide item takes up beyond its own.
create or replace function public.reading_room_item_covers(p_item text, p_zone text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when p_item = 'framed-print' and p_zone in ('bookcase-top-left', 'bookcase-top-right')
      then array['bookcase-top-center']
    when p_item in ('small-sofa', 'chaise', 'writing-desk') and p_zone = 'mid-left'
      then array['corner-left']
    when p_item in ('small-sofa', 'chaise', 'writing-desk') and p_zone = 'mid-right'
      then array['corner-right']
    else array[]::text[]
  end
$$;

-- ---------------------------------------------------------------------------
-- reading_rooms
-- ---------------------------------------------------------------------------

create table public.reading_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'My reading room',
  is_active boolean not null default true,
  wall_style text not null default 'warm-paper',
  floor_style text not null default 'warm-oak-floor',
  bookcase_style text not null default 'classic',
  material_style text not null default 'warm-oak',
  ambience_style text not null default 'daylight',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Lets items reference (room, owner) so an item can never belong to someone else's room.
  constraint reading_rooms_id_user_unique unique (id, user_id),
  constraint reading_rooms_name_valid check (
    char_length(name) between 1 and 60 and name = btrim(name) and name !~ '[[:cntrl:]]'
  ),
  constraint reading_rooms_wall_style_known check (
    wall_style in ('warm-paper', 'soft-sage', 'dusty-blue', 'faded-rose', 'tiny-botanical', 'vintage-floral',
                   'toile', 'library-stripe', 'arts-and-crafts', 'quiet-damask', 'storybook-night')
  ),
  constraint reading_rooms_floor_style_known check (
    floor_style in ('warm-oak-floor', 'dark-wood-floor', 'pale-oak-floor', 'old-parquet', 'muted-stone')
  ),
  constraint reading_rooms_bookcase_style_known check (bookcase_style in ('classic', 'floating', 'arched')),
  constraint reading_rooms_material_style_known check (
    material_style in ('warm-oak', 'dark-walnut', 'honey-pine', 'painted-cream')
  ),
  constraint reading_rooms_ambience_style_known check (
    ambience_style in ('daylight', 'golden-evening', 'soft-night')
  )
);

create index reading_rooms_user_id_idx on public.reading_rooms (user_id);
create unique index reading_rooms_one_active_per_user on public.reading_rooms (user_id) where is_active;

create trigger reading_rooms_set_updated_at
  before update on public.reading_rooms
  for each row execute function public.set_updated_at();

-- A small, generous cap so saved rooms can never grow without bound.
create or replace function public.reading_rooms_enforce_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.reading_rooms where user_id = new.user_id) >= 12 then
    raise exception 'A reader can keep at most 12 reading rooms' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger reading_rooms_enforce_limit
  before insert on public.reading_rooms
  for each row execute function public.reading_rooms_enforce_limit();

alter table public.reading_rooms enable row level security;

create policy "Users can read their own rooms"
  on public.reading_rooms for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own rooms"
  on public.reading_rooms for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own rooms"
  on public.reading_rooms for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own rooms"
  on public.reading_rooms for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.reading_rooms from anon, authenticated;
grant select, delete on table public.reading_rooms to authenticated;
grant insert (user_id, name, is_active, wall_style, floor_style, bookcase_style, material_style, ambience_style)
  on table public.reading_rooms to authenticated;
-- A room never changes owner.
grant update (name, is_active, wall_style, floor_style, bookcase_style, material_style, ambience_style)
  on table public.reading_rooms to authenticated;

-- ---------------------------------------------------------------------------
-- reading_room_items
-- ---------------------------------------------------------------------------

create table public.reading_room_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  user_id uuid not null,
  kind text not null,
  item_id text not null,
  zone text not null,
  finish text,
  light_tone text,
  light_on boolean,
  created_at timestamptz not null default now(),

  constraint reading_room_items_room_fk foreign key (room_id, user_id)
    references public.reading_rooms (id, user_id) on delete cascade,
  constraint reading_room_items_zone_unique unique (room_id, zone),
  constraint reading_room_items_item_unique unique (room_id, item_id),
  constraint reading_room_items_kind_known check (
    kind in ('architecture', 'rug', 'furniture', 'fixture', 'object')
  ),
  constraint reading_room_items_valid check (
    public.reading_room_item_valid(kind, item_id, zone, finish, light_tone, light_on)
  )
);

create index reading_room_items_user_id_idx on public.reading_room_items (user_id);

-- Rules that span placements: nothing in a zone a wide item covers, and every
-- tabletop placement stands on a table.
create or replace function public.reading_room_consistent(p_room uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1
    from public.reading_room_items as a
    join public.reading_room_items as b on b.room_id = a.room_id and b.id <> a.id
    where a.room_id = p_room
      and b.zone = any (public.reading_room_item_covers(a.item_id, a.zone))
  )
  and not exists (
    select 1
    from public.reading_room_items as top
    where top.room_id = p_room
      and top.zone in ('table-left', 'table-center', 'table-right')
      and not exists (
        select 1
        from public.reading_room_items as tbl
        where tbl.room_id = p_room
          and (
            (top.zone = 'table-left' and tbl.zone = 'mid-left' and tbl.item_id in ('round-side-table', 'writing-desk'))
            or (top.zone = 'table-right' and tbl.zone = 'mid-right' and tbl.item_id in ('round-side-table', 'writing-desk'))
            or (top.zone = 'table-center' and tbl.zone in ('mid-center', 'front-center') and tbl.item_id = 'coffee-table')
          )
      )
  )
$$;

create or replace function public.reading_room_items_check_room()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  room uuid;
begin
  if tg_op = 'DELETE' then
    room := old.room_id;
  else
    room := new.room_id;
  end if;
  if not public.reading_room_consistent(room) then
    raise exception 'Room items overlap or stand on nothing' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger reading_room_items_consistent
  after insert or update or delete on public.reading_room_items
  deferrable initially deferred
  for each row execute function public.reading_room_items_check_room();

alter table public.reading_room_items enable row level security;

create policy "Users can read their own room items"
  on public.reading_room_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add items to their own rooms"
  on public.reading_room_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can move items in their own rooms"
  on public.reading_room_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove items from their own rooms"
  on public.reading_room_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.reading_room_items from anon, authenticated;
grant select, delete on table public.reading_room_items to authenticated;
grant insert (room_id, user_id, kind, item_id, zone, finish, light_tone, light_on)
  on table public.reading_room_items to authenticated;
-- An item never changes room, owner or identity; it can move and be restyled.
grant update (zone, finish, light_tone, light_on) on table public.reading_room_items to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic save of the active room
-- ---------------------------------------------------------------------------

-- p_room:  { "wall", "floor", "bookcase", "material", "ambience" } (exactly these keys, strings)
-- p_items: [ { "kind", "item", "zone", "finish", "tone", "on" } ... ] (exactly these keys;
--          finish/tone may be null, on is a boolean or null)
-- Replaces the reader's active room (creating it the first time) and returns its id.
create or replace function public.save_reading_room(p_room jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  reader uuid := auth.uid();
  room uuid;
  entry jsonb;
begin
  if reader is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if p_room is null
    or jsonb_typeof(p_room) <> 'object'
    or (select array_agg(key order by key) from jsonb_object_keys(p_room) as key)
       is distinct from array['ambience', 'bookcase', 'floor', 'material', 'wall']
    or exists (select 1 from jsonb_each(p_room) as field where jsonb_typeof(field.value) <> 'string')
  then
    raise exception 'Invalid room' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 22 then
    raise exception 'Invalid room items' using errcode = '22023';
  end if;

  for entry in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(entry) <> 'object'
      or (select array_agg(key order by key) from jsonb_object_keys(entry) as key)
         is distinct from array['finish', 'item', 'kind', 'on', 'tone', 'zone']
      or jsonb_typeof(entry -> 'kind') <> 'string'
      or jsonb_typeof(entry -> 'item') <> 'string'
      or jsonb_typeof(entry -> 'zone') <> 'string'
      or jsonb_typeof(entry -> 'finish') not in ('string', 'null')
      or jsonb_typeof(entry -> 'tone') not in ('string', 'null')
      or jsonb_typeof(entry -> 'on') not in ('boolean', 'null')
    then
      raise exception 'Invalid room item' using errcode = '22023';
    end if;
  end loop;

  select id into room
  from public.reading_rooms
  where user_id = reader and is_active
  for update;

  if room is null then
    insert into public.reading_rooms (user_id, wall_style, floor_style, bookcase_style, material_style, ambience_style)
    values (reader, p_room ->> 'wall', p_room ->> 'floor', p_room ->> 'bookcase', p_room ->> 'material', p_room ->> 'ambience')
    returning id into room;
  else
    update public.reading_rooms
    set wall_style = p_room ->> 'wall',
        floor_style = p_room ->> 'floor',
        bookcase_style = p_room ->> 'bookcase',
        material_style = p_room ->> 'material',
        ambience_style = p_room ->> 'ambience'
    where id = room;
  end if;

  delete from public.reading_room_items where room_id = room;

  insert into public.reading_room_items (room_id, user_id, kind, item_id, zone, finish, light_tone, light_on)
  select room,
         reader,
         placement ->> 'kind',
         placement ->> 'item',
         placement ->> 'zone',
         placement ->> 'finish',
         placement ->> 'tone',
         case when jsonb_typeof(placement -> 'on') = 'boolean' then (placement ->> 'on')::boolean end
  from jsonb_array_elements(p_items) as placement;

  -- Check the whole room now, so a bad arrangement fails this call rather than the commit.
  set constraints public.reading_room_items_consistent immediate;

  return room;
end;
$$;

revoke execute on function public.reading_room_item_zones(text, text) from public, anon;
revoke execute on function public.reading_room_item_valid(text, text, text, text, text, boolean) from public, anon;
revoke execute on function public.reading_room_item_covers(text, text) from public, anon;
revoke execute on function public.reading_room_consistent(uuid) from public, anon;
revoke execute on function public.reading_rooms_enforce_limit() from public, anon, authenticated;
revoke execute on function public.reading_room_items_check_room() from public, anon, authenticated;
revoke execute on function public.save_reading_room(jsonb, jsonb) from public, anon;
grant execute on function public.reading_room_item_zones(text, text) to authenticated;
grant execute on function public.reading_room_item_valid(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.reading_room_item_covers(text, text) to authenticated;
grant execute on function public.reading_room_consistent(uuid) to authenticated;
grant execute on function public.save_reading_room(jsonb, jsonb) to authenticated;

comment on table public.shelf_preferences is
  'Predecessor of reading_rooms. Read as a fallback for readers without a reading room; never written by the room UI.';

commit;
