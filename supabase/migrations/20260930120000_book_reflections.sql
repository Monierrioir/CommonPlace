-- Commonplace: private reflections written after finishing a book.
--
-- Apply once, in the Supabase SQL Editor (paste the whole file and run) or with
-- `supabase db push` from a linked CLI. It runs in a single transaction, so a
-- failure leaves the database unchanged. Requires the initial migration
-- (20260929120000_initial_profiles_books_library.sql).
--
-- Only creates new objects: existing profiles, books and user_library rows are
-- neither read nor modified, and no reflection is required for Finished books.
--
-- Design:
--   * One reflection per reader per book, attached to the reader's own library
--     entry through the composite key (user_id, book_id). A reflection can
--     therefore only exist for a book on the author's shelves, and removing that
--     entry removes its reflection. Another reader's entry can never be the
--     parent, because the key includes user_id.
--   * Status changes never touch reflections; they are part of the reader's
--     history with the book.
--   * The shared books catalog stays free of personal data.
--   * Row Level Security and column privileges follow the initial migration:
--     ownership comes from auth.uid(), ids and timestamps are not client-writable,
--     and the anon role has no access.

begin;

create table public.book_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid not null,
  rating smallint,
  favorite_character text,
  least_favorite_character text,
  liked_aspects text[] not null default '{}',
  emotions text[] not null default '{}',
  would_live_there text,
  final_thought text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint book_reflections_user_book_unique unique (user_id, book_id),
  constraint book_reflections_library_entry_fkey foreign key (user_id, book_id)
    references public.user_library (user_id, book_id) on delete cascade,

  constraint book_reflections_rating_range check (rating is null or rating between 1 and 5),
  constraint book_reflections_favorite_character_text check (
    favorite_character is null
    or (favorite_character = btrim(favorite_character) and char_length(favorite_character) between 1 and 120)
  ),
  constraint book_reflections_least_favorite_character_text check (
    least_favorite_character is null
    or (least_favorite_character = btrim(least_favorite_character) and char_length(least_favorite_character) between 1 and 120)
  ),
  constraint book_reflections_liked_aspects_known check (
    liked_aspects <@ array[
      'characters', 'story', 'world', 'atmosphere', 'writing', 'themes', 'romance', 'pacing'
    ]::text[]
    and cardinality(liked_aspects) <= 8
  ),
  constraint book_reflections_emotions_known check (
    emotions <@ array[
      'happy', 'sad', 'anxious', 'hopeful', 'nostalgic',
      'inspired', 'devastated', 'comforted', 'unsettled', 'thoughtful'
    ]::text[]
    and cardinality(emotions) <= 10
  ),
  constraint book_reflections_would_live_there_known check (
    would_live_there is null or would_live_there in ('yes', 'maybe', 'no')
  ),
  constraint book_reflections_final_thought_text check (
    final_thought is null
    or (final_thought = btrim(final_thought) and char_length(final_thought) between 1 and 1000)
  ),
  -- Skipping writes no row; a stored reflection always holds at least one real answer.
  constraint book_reflections_has_content check (
    rating is not null
    or favorite_character is not null
    or least_favorite_character is not null
    or cardinality(liked_aspects) > 0
    or cardinality(emotions) > 0
    or would_live_there is not null
    or final_thought is not null
  )
);

-- Multi-select answers are stored as a set: no nulls, no repeats, stable order.
create or replace function public.normalize_book_reflection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.liked_aspects := array(
    select distinct aspect from unnest(coalesce(new.liked_aspects, '{}'::text[])) as aspect
    where aspect is not null
    order by aspect
  );
  new.emotions := array(
    select distinct emotion from unnest(coalesce(new.emotions, '{}'::text[])) as emotion
    where emotion is not null
    order by emotion
  );
  return new;
end;
$$;

revoke execute on function public.normalize_book_reflection() from public, anon, authenticated;

create trigger book_reflections_normalize
  before insert or update on public.book_reflections
  for each row execute function public.normalize_book_reflection();

create trigger book_reflections_set_updated_at
  before update on public.book_reflections
  for each row execute function public.set_updated_at();

alter table public.book_reflections enable row level security;

create policy "Users can read their own reflections"
  on public.book_reflections for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can write their own reflections"
  on public.book_reflections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own reflections"
  on public.book_reflections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own reflections"
  on public.book_reflections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.book_reflections from anon, authenticated;
grant select, delete on table public.book_reflections to authenticated;
grant insert (
  user_id, book_id, rating, favorite_character, least_favorite_character,
  liked_aspects, emotions, would_live_there, final_thought
) on table public.book_reflections to authenticated;
-- The (user_id, book_id) key is fixed once written: a reflection never moves to another book.
grant update (
  rating, favorite_character, least_favorite_character,
  liked_aspects, emotions, would_live_there, final_thought
) on table public.book_reflections to authenticated;

commit;
