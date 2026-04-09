-- Enable extensions if needed
create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  public_id text unique,
  avatar_url text
);

create unique index if not exists profiles_public_id_key on public.profiles(public_id);

-- STUDY SESSIONS
create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_date_idx on public.study_sessions(user_id, date);

-- Unique constraint so per-minute upserts never create duplicate rows for the same day
alter table public.study_sessions
  add constraint if not exists study_sessions_user_date_unique unique (user_id, date);

-- FRIEND REQUESTS
create table if not exists public.friend_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);

create index if not exists friend_requests_requester_idx on public.friend_requests(requester_id);
create index if not exists friend_requests_addressee_idx on public.friend_requests(addressee_id);
create index if not exists friend_requests_status_idx on public.friend_requests(status);

-- FRIENDS
create table if not exists public.friends (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, friend_id)
);

create index if not exists friends_user_idx on public.friends(user_id);

-- STORAGE BUCKET (avatars)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS (avatars)
create policy "avatars_read_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_upload_own"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '-', 1));

create policy "avatars_update_own"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '-', 1));

create policy "avatars_delete_own"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '-', 1));

-- RLS
alter table public.profiles enable row level security;
alter table public.study_sessions enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;

-- Profiles: users can read public profiles (for friend search), and update their own
create policy "profiles_read_public"
  on public.profiles for select
  using (public_id is not null);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Study sessions: own + friends (friends needed for leaderboard)
create policy "sessions_read_own_and_friends"
  on public.study_sessions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friends
      where friends.user_id = auth.uid()
        and friends.friend_id = study_sessions.user_id
    )
  );

create policy "sessions_write_own"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions_update_own"
  on public.study_sessions for update
  using (auth.uid() = user_id);

-- Friend requests: own incoming/outgoing
create policy "requests_read_own"
  on public.friend_requests for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "requests_insert_own"
  on public.friend_requests for insert
  with check (auth.uid() = requester_id);

create policy "requests_update_participants"
  on public.friend_requests for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Friends: allow insert if you are part of the pair (so accept can add both rows)
create policy "friends_read_own"
  on public.friends for select
  using (auth.uid() = user_id);

create policy "friends_insert_participant"
  on public.friends for insert
  with check (auth.uid() = user_id or auth.uid() = friend_id);

-- Realtime: study_sessions changes broadcast to subscribers (leaderboard live updates)
alter publication supabase_realtime add table public.study_sessions;

-- Prevent duplicate pending requests
create unique index if not exists friend_requests_unique_pair
  on public.friend_requests (requester_id, addressee_id)
  where status = 'pending';
