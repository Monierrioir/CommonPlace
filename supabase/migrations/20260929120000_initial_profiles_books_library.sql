-- Commonplace: profiles, the shared book catalog, and personal libraries.
--
-- Apply once, in the Supabase SQL Editor (paste the whole file and run) or with
-- `supabase db push` from a linked CLI. It runs in a single transaction, so a
-- failure leaves the database unchanged.
--
-- Security model:
--   * Row Level Security is enabled on every table; ownership is always derived
--     from auth.uid(), never from a client-supplied id.
--   * Table privileges are narrowed to exactly the operations the app needs, so
--     columns such as ids and timestamps cannot be written by clients.
--   * The anon role has no access to these tables.

begin;

-- ---------------------------------------------------------------------------
-- Shared helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, username, avatar_url) on table public.profiles to authenticated;

-- Runs as the table owner so it can insert while RLS blocks client inserts.
-- The display name comes from the sign-up form's user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60), '')
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts created before this migration ran get their profile now.
insert into public.profiles (id, display_name)
select
  u.id,
  nullif(left(btrim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), 60), '')
from auth.users as u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- books: shared, provider-normalized catalog with no per-user state
-- ---------------------------------------------------------------------------

create table public.books (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_work_id text not null,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  cover_id text,
  first_publish_year integer,
  created_at timestamptz not null default now(),
  constraint books_provider_work_unique unique (provider, provider_work_id),
  constraint books_provider_known check (provider in ('openlibrary')),
  constraint books_provider_work_id_length check (char_length(provider_work_id) between 1 and 100),
  constraint books_title_length check (char_length(btrim(title)) between 1 and 500),
  constraint books_authors_array check (jsonb_typeof(authors) = 'array' and jsonb_array_length(authors) <= 50),
  constraint books_cover_id_length check (cover_id is null or char_length(cover_id) between 1 and 100),
  constraint books_first_publish_year_range check (
    first_publish_year is null or first_publish_year between -4000 and 3000
  )
);

alter table public.books enable row level security;

create policy "Signed-in users can read the catalog"
  on public.books for select
  to authenticated
  using (true);

-- Lets the add-to-library flow register a book it hasn't seen before. Rows are
-- immutable afterwards: there are no update or delete policies or privileges.
create policy "Signed-in users can add catalog entries"
  on public.books for insert
  to authenticated
  with check (true);

revoke all on table public.books from anon, authenticated;
grant select on table public.books to authenticated;
grant insert (provider, provider_work_id, title, authors, cover_id, first_publish_year)
  on table public.books to authenticated;

-- ---------------------------------------------------------------------------
-- user_library: each user's relationship to a catalog book
-- ---------------------------------------------------------------------------

create table public.user_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  status text not null,
  favorite boolean not null default false,
  progress integer,
  date_added timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_library_user_book_unique unique (user_id, book_id),
  constraint user_library_status_check check (
    status in ('want-to-read', 'currently-reading', 'finished', 'dnf')
  ),
  constraint user_library_progress_check check (progress is null or progress between 0 and 100)
);

create index user_library_book_id_idx on public.user_library (book_id);

create trigger user_library_set_updated_at
  before update on public.user_library
  for each row execute function public.set_updated_at();

alter table public.user_library enable row level security;

create policy "Users can read their own library"
  on public.user_library for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add to their own library"
  on public.user_library for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own library"
  on public.user_library for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove from their own library"
  on public.user_library for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_library from anon, authenticated;
grant select, delete on table public.user_library to authenticated;
-- date_added is insertable so books imported from the local prototype keep their original date.
grant insert (user_id, book_id, status, favorite, progress, date_added)
  on table public.user_library to authenticated;
grant update (status, favorite, progress) on table public.user_library to authenticated;

commit;
