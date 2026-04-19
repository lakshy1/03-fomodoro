-- ============================================================
-- Migration: Add notes table and RLS policies
-- Run this in: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

create table if not exists public.notes (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  color text not null default 'default',
  updated_at bigint not null default 0,
  deleted boolean not null default false,
  primary key (id, user_id)
);

create index if not exists notes_user_updated_idx
  on public.notes(user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_read_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_read_own"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "notes_delete_own"
  on public.notes for delete
  using (auth.uid() = user_id);
