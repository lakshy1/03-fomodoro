-- Atomic focus-minute increments so leaderboard/calendar totals never lose
-- updates when multiple timer flushes happen close together.

create or replace function public.add_focus_minutes(
  p_user_id uuid,
  p_date date,
  p_minutes integer
)
returns void
language plpgsql
as $$
begin
  if p_minutes is null or p_minutes <= 0 then
    return;
  end if;

  insert into public.study_sessions (user_id, date, minutes)
  values (p_user_id, p_date, p_minutes)
  on conflict (user_id, date)
  do update
    set minutes = study_sessions.minutes + excluded.minutes;
end;
$$;

grant execute on function public.add_focus_minutes(uuid, date, integer) to authenticated;
