-- Commonplace: bookcase models and wallpapers (Living Bookshelf customization v1.5).
--
-- Apply once, in the Supabase SQL Editor (paste the whole file and run) or with
-- `supabase db push` from a linked CLI. It runs in a single transaction, so a
-- failure leaves the database unchanged. Requires the applied shelf migration
-- (20260930190000_shelf_preferences.sql). It does not depend on the draft
-- 20260930180000 themes/place migration.
--
-- Only changes public.shelf_preferences: profiles, books, user_library and
-- book_reflections are neither read nor modified.
--
-- What changes:
--   * bookcase_style: the structure of the bookcase, kept apart from shelf_style
--     (which stays the material: warm-oak, dark-walnut, honey-pine,
--     painted-cream). Known ids: classic, floating, arched.
--       - Existing rows become 'classic', the bookcase they already had.
--       - Unlike the v1 columns it has a default ('classic'): the app version
--         released with v1 inserts rows without naming this column, and must keep
--         working between applying this migration and deploying the new app.
--       - Readers with no row are unaffected: no row still means "the default
--         shelf", and the default bookcase is classic.
--   * wall_style also accepts wallpaper ids. A wall is one surface, so paint and
--     wallpaper share the column; "paint" or "wallpaper" is presentation only.
--       paint:      warm-paper, soft-sage, dusty-blue, faded-rose (unchanged)
--       wallpaper:  tiny-botanical, vintage-floral, toile, library-stripe,
--                   arts-and-crafts, quiet-damask, storybook-night
--   * Every value is still a known preset id; nothing is interpreted as CSS, a
--     colour or a URL.
--   * Row Level Security is unchanged (policies are per row). Column privileges
--     are extended to the new column only: authenticated may insert and update
--     bookcase_style; user_id and timestamps stay out of reach; anon has no access.

begin;

alter table public.shelf_preferences
  add column bookcase_style text not null default 'classic';

alter table public.shelf_preferences
  add constraint shelf_preferences_bookcase_style_known check (
    bookcase_style in ('classic', 'floating', 'arched')
  );

alter table public.shelf_preferences
  drop constraint shelf_preferences_wall_style_known;

alter table public.shelf_preferences
  add constraint shelf_preferences_wall_style_known check (
    wall_style in (
      'warm-paper', 'soft-sage', 'dusty-blue', 'faded-rose',
      'tiny-botanical', 'vintage-floral', 'toile', 'library-stripe',
      'arts-and-crafts', 'quiet-damask', 'storybook-night'
    )
  );

grant insert (bookcase_style) on table public.shelf_preferences to authenticated;
grant update (bookcase_style) on table public.shelf_preferences to authenticated;

commit;
