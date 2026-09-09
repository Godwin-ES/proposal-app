-- Require a revision before resubmitting a proposal an approver sent back.
--
-- submit_proposal_for_approval previously allowed resubmitting the exact
-- same version an approver already marked changes_requested on — nothing
-- stopped a salesperson from clicking "Submit for Approval" again with zero
-- edits, sending the approver the identical content with no signal that
-- their feedback was addressed. A revision (saveManualRevision or a section
-- regeneration) always creates a new proposal_versions row and moves
-- current_version_id forward, so "has current_version_id changed since the
-- last changes_requested decision" is exactly the right check.

create or replace function submit_proposal_for_approval(
  p_proposal_id uuid,
  p_expected_current_version_id uuid
) returns proposals as $$
declare
  v_proposal proposals;
  v_last_changes_requested_version_id uuid;
begin
  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_proposal.status not in ('draft', 'needs_clarification', 'changes_requested') then
    raise exception 'INVALID_STATE: proposal is not in an editable/submittable state (status: %)', v_proposal.status;
  end if;

  if v_proposal.current_version_id is null then
    raise exception 'READINESS_ERROR: no proposal version exists to submit';
  end if;

  if v_proposal.current_version_id is distinct from p_expected_current_version_id then
    raise exception 'STALE_VERSION: proposal changed since this submission started';
  end if;

  if v_proposal.status = 'changes_requested' then
    select version_id into v_last_changes_requested_version_id
    from approvals
    where proposal_id = p_proposal_id and decision = 'changes_requested'
    order by created_at desc
    limit 1;

    if v_last_changes_requested_version_id is not null
       and v_last_changes_requested_version_id = v_proposal.current_version_id then
      raise exception 'READINESS_ERROR: revise the proposal before resubmitting — an approver requested changes on this exact version';
    end if;
  end if;

  update proposals set
    status = 'pending_approval',
    approval_submitted_at = now(),
    approval_submitted_by = auth.uid()
  where id = p_proposal_id
  returning * into v_proposal;

  return v_proposal;
end;
$$ language plpgsql security definer set search_path = public;
