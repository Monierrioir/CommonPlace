-- Commonplace: book-specific answers in reflections — the themes that stayed with the
-- reader and the place they would wander off to.
--
-- Apply once, in the Supabase SQL Editor (paste the whole file and run) or with
-- `supabase db push` from a linked CLI. It runs in a single transaction, so a
-- failure leaves the database unchanged. Requires 20260930120000_book_reflections.sql.
--
-- Additive only: two columns with empty defaults, so every existing reflection keeps
-- its answers and reads as "not answered" for the new questions. Ownership, the
-- composite library-entry key, cascade behaviour and RLS policies are unchanged.
--
-- Design:
--   * book_themes holds stable keys from the controlled theme vocabulary
--     (lib/enrichment/theme-vocabulary.ts), never labels, so labels can be reworded
--     without touching stored answers. Keys are never renamed or removed; adding a
--     key to the vocabulary needs a migration that widens the list below. It is
--     separate from liked_aspects' generic 'themes' aspect ("What drew you in?").
--   * favorite_place holds the place's label as the reader chose or wrote it. Places
--     have no controlled vocabulary, so it is trimmed free text like the character
--     answers.
--   * Both count as content: a reflection holding only a theme or a place is kept,
--     and clearing every answer still leaves nothing to store.

begin;

alter table public.book_reflections
  add column book_themes text[] not null default '{}',
  add column favorite_place text;

alter table public.book_reflections
  add constraint book_reflections_book_themes_known check (
    book_themes <@ array[
      'friendship', 'family', 'love', 'marriage',
      'identity', 'coming_of_age', 'belonging', 'loneliness', 'alienation', 'memory',
      'ambition', 'obsession', 'madness', 'idleness', 'aging',
      'morality', 'good_and_evil', 'guilt', 'redemption', 'justice', 'crime', 'violence',
      'revenge', 'betrayal', 'sacrifice', 'duty', 'courage', 'free_will', 'fate',
      'religion', 'philosophy', 'humanity',
      'power', 'politics', 'war', 'oppression', 'freedom', 'class', 'poverty', 'wealth',
      'society', 'colonialism', 'prejudice', 'gender', 'education', 'work',
      'nature', 'ecology', 'survival', 'technology', 'magic',
      'grief', 'death', 'suffering', 'fear', 'trauma', 'hope',
      'journeys', 'art'
    ]::text[]
    and cardinality(book_themes) <= 6
  ),
  add constraint book_reflections_favorite_place_text check (
    favorite_place is null
    or (favorite_place = btrim(favorite_place) and char_length(favorite_place) between 1 and 120)
  ),
  drop constraint book_reflections_has_content,
  add constraint book_reflections_has_content check (
    rating is not null
    or favorite_character is not null
    or least_favorite_character is not null
    or cardinality(liked_aspects) > 0
    or cardinality(book_themes) > 0
    or cardinality(emotions) > 0
    or favorite_place is not null
    or would_live_there is not null
    or final_thought is not null
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
  new.book_themes := array(
    select distinct theme from unnest(coalesce(new.book_themes, '{}'::text[])) as theme
    where theme is not null
    order by theme
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

grant insert (book_themes, favorite_place) on table public.book_reflections to authenticated;
grant update (book_themes, favorite_place) on table public.book_reflections to authenticated;

commit;
