-- Week 3 AI Proposal / Document Application — business RPCs
-- See week-3/SYSTEM-DESIGN-NEXTJS.md §4/§13/§14/§15/§16 for the authoritative spec.
--
-- Every function derives the acting user from auth.uid() and never accepts
-- an actor id as an argument. Error messages are prefixed with the
-- ProposalErrorCode they map to (lib/domain/errors.ts) so the repository
-- layer can translate a raised exception into the typed ActionError contract
-- without parsing raw Postgres/SQL text.

-- ---------------------------------------------------------------------------
-- update_pre_generation_intake
-- ---------------------------------------------------------------------------

create or replace function update_pre_generation_intake(
  p_proposal_id uuid,
  p_client_name text,
  p_company_name text,
  p_date_of_call date,
  p_salesperson_name text,
  p_client_needs_summary text,
  p_project_scope text,
  p_goals_and_objectives text,
  p_recommended_services text,
  p_proposed_timeline text,
  p_estimated_pricing text
) returns proposals as $$
declare
  v_proposal proposals;
begin
  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_proposal.current_version_id is not null then
    raise exception 'INVALID_STATE: intake can only be edited before the first proposal version exists';
  end if;

  if v_proposal.status not in ('draft', 'needs_clarification') then
    raise exception 'INVALID_STATE: proposal is not editable (status: %)', v_proposal.status;
  end if;

  update proposals set
    client_name = p_client_name,
    company_name = p_company_name,
    date_of_call = p_date_of_call,
    salesperson_name = p_salesperson_name,
    client_needs_summary = p_client_needs_summary,
    project_scope = p_project_scope,
    goals_and_objectives = p_goals_and_objectives,
    recommended_services = p_recommended_services,
    proposed_timeline = p_proposed_timeline,
    estimated_pricing = p_estimated_pricing
  where id = p_proposal_id
  returning * into v_proposal;

  return v_proposal;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- update_client_email
-- ---------------------------------------------------------------------------

create or replace function update_client_email(
  p_proposal_id uuid,
  p_client_email text
) returns proposals as $$
declare
  v_proposal proposals;
begin
  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_proposal.status = 'delivered' then
    raise exception 'INVALID_STATE: a delivered proposal is read-only';
  end if;

  update proposals set client_email = nullif(p_client_email, '')
  where id = p_proposal_id
  returning * into v_proposal;

  return v_proposal;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- create_proposal_version
-- ---------------------------------------------------------------------------

create or replace function create_proposal_version(
  p_proposal_id uuid,
  p_expected_current_version_id uuid,
  p_snapshot jsonb,
  p_content_hash text,
  p_change_type text,
  p_changed_section text,
  p_revision_instruction text,
  p_clarification_flags jsonb,
  p_next_status text
) returns proposal_versions as $$
declare
  v_proposal proposals;
  v_profile_role text;
  v_next_version_number integer;
  v_version proposal_versions;
begin
  select role into v_profile_role from profiles where user_id = auth.uid();
  if v_profile_role is distinct from 'salesperson' then
    raise exception 'PERMISSION_DENIED: only a salesperson can create a proposal version';
  end if;

  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_proposal.status in ('pending_approval', 'delivered') then
    raise exception 'INVALID_STATE: proposal cannot be revised while % ', v_proposal.status;
  end if;

  if p_next_status not in ('draft', 'needs_clarification') then
    raise exception 'VALIDATION_ERROR: invalid next status %', p_next_status;
  end if;

  if p_snapshot is null then
    raise exception 'VALIDATION_ERROR: snapshot is required';
  end if;

  -- null-safe comparison of expected vs current version
  if v_proposal.current_version_id is distinct from p_expected_current_version_id then
    raise exception 'STALE_VERSION: proposal changed since this edit/generation started';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next_version_number
  from proposal_versions where proposal_id = p_proposal_id;

  insert into proposal_versions (
    proposal_id, version_number, snapshot, content_hash, change_type,
    changed_section, revision_instruction, clarification_flags, created_by
  ) values (
    p_proposal_id, v_next_version_number, p_snapshot, p_content_hash, p_change_type,
    p_changed_section, p_revision_instruction, coalesce(p_clarification_flags, '[]'::jsonb), auth.uid()
  ) returning * into v_version;

  update proposals set
    current_version_id = v_version.id,
    approval_submitted_at = null,
    approval_submitted_by = null,
    status = p_next_status
  where id = p_proposal_id;

  return v_version;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- submit_proposal_for_approval
-- ---------------------------------------------------------------------------

create or replace function submit_proposal_for_approval(
  p_proposal_id uuid,
  p_expected_current_version_id uuid
) returns proposals as $$
declare
  v_proposal proposals;
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

  update proposals set
    status = 'pending_approval',
    approval_submitted_at = now(),
    approval_submitted_by = auth.uid()
  where id = p_proposal_id
  returning * into v_proposal;

  return v_proposal;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- decide_proposal_approval
-- ---------------------------------------------------------------------------

create or replace function decide_proposal_approval(
  p_proposal_id uuid,
  p_version_id uuid,
  p_decision text,
  p_comments text
) returns approvals as $$
declare
  v_proposal proposals;
  v_profile_role text;
  v_approval approvals;
begin
  select role into v_profile_role from profiles where user_id = auth.uid();
  if v_profile_role is distinct from 'approver' then
    raise exception 'PERMISSION_DENIED: only an approver can decide a proposal';
  end if;

  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'VALIDATION_ERROR: invalid decision %', p_decision;
  end if;

  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by = auth.uid() then
    raise exception 'PERMISSION_DENIED: you cannot approve your own proposal';
  end if;

  if v_proposal.status <> 'pending_approval' then
    raise exception 'INVALID_STATE: proposal is not pending approval (status: %)', v_proposal.status;
  end if;

  if v_proposal.current_version_id is distinct from p_version_id then
    raise exception 'STALE_VERSION: the submitted version is no longer the current version';
  end if;

  insert into approvals (proposal_id, version_id, decision, approver_id, comments)
  values (p_proposal_id, p_version_id, p_decision, auth.uid(), p_comments)
  returning * into v_approval;

  update proposals set
    status = case when p_decision = 'approved' then 'approved' else 'changes_requested' end
  where id = p_proposal_id;

  return v_approval;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- set_version_pdf_state
-- ---------------------------------------------------------------------------

create or replace function set_version_pdf_state(
  p_proposal_id uuid,
  p_version_id uuid,
  p_status text,
  p_storage_path text,
  p_sha256 text,
  p_generated_at timestamptz,
  p_error text
) returns proposal_versions as $$
declare
  v_proposal proposals;
  v_version proposal_versions;
begin
  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_proposal.current_version_id is distinct from p_version_id then
    raise exception 'INVALID_STATE: pdf state can only be set for the current version';
  end if;

  if p_status not in ('generating', 'ready', 'failed') then
    raise exception 'VALIDATION_ERROR: invalid pdf status %', p_status;
  end if;

  if p_status in ('generating', 'ready') and v_proposal.status <> 'approved' then
    raise exception 'INVALID_STATE: proposal must be approved to generate a final pdf';
  end if;

  if p_status = 'ready' and (p_storage_path is null or p_sha256 is null or p_generated_at is null) then
    raise exception 'VALIDATION_ERROR: ready pdf state requires storage path, hash, and generated timestamp';
  end if;

  if p_status = 'failed' and p_error is null then
    raise exception 'VALIDATION_ERROR: failed pdf state requires an error message';
  end if;

  update proposal_versions set
    pdf_status = p_status,
    pdf_storage_path = case when p_status = 'ready' then p_storage_path else pdf_storage_path end,
    pdf_sha256 = case when p_status = 'ready' then p_sha256 else pdf_sha256 end,
    pdf_generated_at = case when p_status = 'ready' then p_generated_at else pdf_generated_at end,
    pdf_error = case when p_status = 'failed' then p_error else null end
  where id = p_version_id
  returning * into v_version;

  return v_version;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- prepare_delivery_attempt
-- ---------------------------------------------------------------------------

create or replace function prepare_delivery_attempt(
  p_proposal_id uuid,
  p_version_id uuid,
  p_recipient text,
  p_provider text,
  p_idempotency_key text
) returns delivery_attempts as $$
declare
  v_proposal proposals;
  v_version proposal_versions;
  v_approval_count integer;
  v_unresolved_uncertain integer;
  v_attempt delivery_attempts;
begin
  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_proposal.status <> 'approved' then
    raise exception 'INVALID_STATE: proposal must be approved to prepare delivery (status: %)', v_proposal.status;
  end if;

  if v_proposal.current_version_id is distinct from p_version_id then
    raise exception 'STALE_VERSION: current version no longer matches the version being delivered';
  end if;

  select * into v_version from proposal_versions where id = p_version_id;

  if v_version.pdf_status <> 'ready' or v_version.pdf_storage_path is null or v_version.pdf_sha256 is null then
    raise exception 'DELIVERY_PREPARATION_FAILED: final pdf is not ready for this version';
  end if;

  select count(*) into v_approval_count from approvals
  where proposal_id = p_proposal_id and version_id = p_version_id and decision = 'approved';

  if v_approval_count = 0 then
    raise exception 'APPROVAL_REQUIRED: no approval exists for the exact current version';
  end if;

  select count(*) into v_unresolved_uncertain from delivery_attempts
  where proposal_id = p_proposal_id and version_id = p_version_id and status = 'uncertain';

  if v_unresolved_uncertain > 0 then
    raise exception 'DELIVERY_OUTCOME_UNCERTAIN: an earlier delivery attempt for this version is unresolved';
  end if;

  insert into delivery_attempts (proposal_id, version_id, recipient, status, provider, idempotency_key, created_by)
  values (p_proposal_id, p_version_id, p_recipient, 'pending', p_provider, p_idempotency_key, auth.uid())
  returning * into v_attempt;

  return v_attempt;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- finalize_delivery_attempt
-- ---------------------------------------------------------------------------

create or replace function finalize_delivery_attempt(
  p_attempt_id uuid,
  p_provider_message_id text
) returns delivery_attempts as $$
declare
  v_attempt delivery_attempts;
  v_proposal proposals;
begin
  select * into v_attempt from delivery_attempts where id = p_attempt_id for update;

  if v_attempt.id is null then
    raise exception 'NOT_FOUND: delivery attempt % does not exist', p_attempt_id;
  end if;

  select * into v_proposal from proposals where id = v_attempt.proposal_id for update;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  -- idempotent re-finalization: same attempt already sent with the same provider id
  if v_attempt.status = 'sent' and v_attempt.provider_message_id = p_provider_message_id then
    return v_attempt;
  end if;

  if v_attempt.status <> 'pending' then
    raise exception 'INVALID_STATE: delivery attempt is not pending (status: %)', v_attempt.status;
  end if;

  update delivery_attempts set
    status = 'sent',
    provider_message_id = p_provider_message_id
  where id = p_attempt_id
  returning * into v_attempt;

  update proposals set status = 'delivered' where id = v_attempt.proposal_id;

  return v_attempt;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- record_delivery_problem
-- ---------------------------------------------------------------------------

create or replace function record_delivery_problem(
  p_attempt_id uuid,
  p_status text,
  p_error text,
  p_provider_message_id text
) returns delivery_attempts as $$
declare
  v_attempt delivery_attempts;
  v_proposal proposals;
begin
  if p_status not in ('failed', 'uncertain') then
    raise exception 'VALIDATION_ERROR: record_delivery_problem may only set failed or uncertain';
  end if;

  select * into v_attempt from delivery_attempts where id = p_attempt_id for update;

  if v_attempt.id is null then
    raise exception 'NOT_FOUND: delivery attempt % does not exist', p_attempt_id;
  end if;

  select * into v_proposal from proposals where id = v_attempt.proposal_id;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_attempt.status <> 'pending' and v_attempt.status <> p_status then
    raise exception 'INVALID_STATE: delivery attempt is not pending (status: %)', v_attempt.status;
  end if;

  update delivery_attempts set
    status = p_status,
    error = p_error,
    provider_message_id = coalesce(p_provider_message_id, provider_message_id)
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------

-- Supabase grants EXECUTE on newly created public-schema functions to
-- anon/authenticated/service_role by default (ALTER DEFAULT PRIVILEGES at
-- the project level). Revoke from PUBLIC *and* explicitly from anon so an
-- unauthenticated request cannot invoke a business RPC at all.
revoke all on function update_pre_generation_intake from public, anon;
revoke all on function update_client_email from public, anon;
revoke all on function create_proposal_version from public, anon;
revoke all on function submit_proposal_for_approval from public, anon;
revoke all on function decide_proposal_approval from public, anon;
revoke all on function set_version_pdf_state from public, anon;
revoke all on function prepare_delivery_attempt from public, anon;
revoke all on function finalize_delivery_attempt from public, anon;
revoke all on function record_delivery_problem from public, anon;

grant execute on function update_pre_generation_intake to authenticated;
grant execute on function update_client_email to authenticated;
grant execute on function create_proposal_version to authenticated;
grant execute on function submit_proposal_for_approval to authenticated;
grant execute on function decide_proposal_approval to authenticated;
grant execute on function set_version_pdf_state to authenticated;
grant execute on function prepare_delivery_attempt to authenticated;
grant execute on function finalize_delivery_attempt to authenticated;
grant execute on function record_delivery_problem to authenticated;
