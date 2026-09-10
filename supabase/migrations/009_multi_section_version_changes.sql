-- Replace the single-section `changed_section` column with a
-- `changed_sections` array, so one saved version can record edits to
-- several sections at once. This supports the salesperson batching several
-- edits (e.g. Timeline + Pricing + Deliverables) into a single version
-- instead of being forced to create one version per field, while keeping
-- the same "what changed in this version" audit trail — just as an array
-- instead of a single value.

alter table proposal_versions add column changed_sections text[] not null default '{}';

update proposal_versions
set changed_sections = case when changed_section is null then '{}'::text[] else array[changed_section] end;

alter table proposal_versions drop column changed_section;

-- ---------------------------------------------------------------------------
-- create_proposal_version — p_changed_section text -> p_changed_sections text[]
-- ---------------------------------------------------------------------------

drop function if exists create_proposal_version(
  uuid, uuid, jsonb, text, text, text, text, jsonb, text
);

create or replace function create_proposal_version(
  p_proposal_id uuid,
  p_expected_current_version_id uuid,
  p_snapshot jsonb,
  p_content_hash text,
  p_change_type text,
  p_changed_sections text[],
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
  if auth.uid() is null then
    raise exception 'PERMISSION_DENIED: authentication required';
  end if;

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
    changed_sections, revision_instruction, clarification_flags, created_by
  ) values (
    p_proposal_id, v_next_version_number, p_snapshot, p_content_hash, p_change_type,
    coalesce(p_changed_sections, '{}'), p_revision_instruction, coalesce(p_clarification_flags, '[]'::jsonb), auth.uid()
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

revoke all on function create_proposal_version from public, anon;
grant execute on function create_proposal_version to authenticated;

-- ---------------------------------------------------------------------------
-- list_version_changes_for_approver — changed_section text -> changed_sections text[]
-- ---------------------------------------------------------------------------

drop function if exists list_version_changes_for_approver(uuid, int);

create or replace function list_version_changes_for_approver(
  p_proposal_id uuid,
  p_since_version_number int
) returns table(
  version_number int,
  change_type text,
  changed_sections text[],
  created_at timestamptz
) as $$
begin
  if not current_role_is('approver') then
    raise exception 'PERMISSION_DENIED: only an approver can call this';
  end if;

  return query
    select pv.version_number, pv.change_type, pv.changed_sections, pv.created_at
    from proposal_versions pv
    where pv.proposal_id = p_proposal_id and pv.version_number > p_since_version_number
    order by pv.version_number asc;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function list_version_changes_for_approver from public, anon;
grant execute on function list_version_changes_for_approver to authenticated;
