-- Add "Withdraw from Approval" — a realistic accidental-submission recovery
-- that today has no path except waiting for the Approver to reject it.
-- Only available while pending_approval and before any decision has been
-- recorded for the current version; returns the proposal to Draft with the
-- submitted version/history left completely intact, and records who
-- withdrew it and when (reset on the next submission, same pattern as
-- approval_submitted_at/by).

alter table proposals add column withdrawn_at timestamptz null;
alter table proposals add column withdrawn_by uuid null references profiles(user_id);

create or replace function withdraw_proposal_submission(
  p_proposal_id uuid,
  p_expected_current_version_id uuid
) returns proposals as $$
declare
  v_proposal proposals;
  v_decided_count integer;
begin
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED: authentication required';
  end if;

  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_proposal.status <> 'pending_approval' then
    raise exception 'INVALID_STATE: only a proposal pending approval can be withdrawn (status: %)', v_proposal.status;
  end if;

  if v_proposal.current_version_id is distinct from p_expected_current_version_id then
    raise exception 'STALE_VERSION: the submitted version is no longer the current version';
  end if;

  select count(*) into v_decided_count from approvals
  where proposal_id = p_proposal_id and version_id = v_proposal.current_version_id;

  if v_decided_count > 0 then
    raise exception 'INVALID_STATE: an approver has already decided this version';
  end if;

  update proposals set
    status = 'draft',
    approval_submitted_at = null,
    approval_submitted_by = null,
    withdrawn_at = now(),
    withdrawn_by = auth.uid()
  where id = p_proposal_id
  returning * into v_proposal;

  return v_proposal;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function withdraw_proposal_submission from public, anon;
grant execute on function withdraw_proposal_submission to authenticated;
