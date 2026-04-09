-- ============================================================
-- Migration: Fix leaderboard RLS + add realtime + unique constraint
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. DROP the old read-only-own policy (too restrictive for leaderboard)
drop policy if exists "sessions_read_own" on public.study_sessions;

-- 2. NEW SELECT policy — own sessions + friends' sessions
--    Required so fetchLeaderboardRange() can read multiple user_ids
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

-- 3. Add UNIQUE constraint on (user_id, date) so per-minute upserts
--    never create duplicate rows for the same day
alter table public.study_sessions
  drop constraint if exists study_sessions_user_date_unique;

alter table public.study_sessions
  add constraint study_sessions_user_date_unique
  unique (user_id, date);

-- 4. Realtime is already enabled for study_sessions (no action needed)
