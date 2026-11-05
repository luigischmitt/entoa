-- A session that ends abandoned without a single answer from the candidate does not use up a trial slot.
-- Typical case: the interview could not start (a backend outage, a blocked microphone) and the person left.
-- The slot is taken when the session is created (so the limit is still enforced up front) and handed back here.

create function public.release_unanswered_trial_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.unlimited_users where user_id = new.user_id) then
    return new;
  end if;

  if exists (select 1 from public.interview_turns where interview_id = new.id and speaker = 'candidate') then
    return new;
  end if;

  update public.session_usage
    set used = greatest(used - 1, 0), updated_at = timezone('utc', now())
    where user_id = new.user_id and mode = new.mode;
  return new;
end;
$$;

-- Only the move into "abandoned" releases the slot, so repeated syncs of the same status never give back more than one.
create trigger interviews_release_unanswered_trial_session
after update of status on public.interviews
for each row
when (old.status is distinct from new.status and new.status = 'abandoned')
execute function public.release_unanswered_trial_session();

revoke all on function public.release_unanswered_trial_session() from public, anon, authenticated;
