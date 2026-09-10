-- Strengthen create_proposal_version's DB-enforced invariants (review
-- Technical issue 5, Option B): today it checks role/ownership/status/
-- expected-version/allowed-next-status/snapshot-non-null, but otherwise
-- trusts the caller's snapshot shape, change_type, changed_sections and
-- next_status outright — an authenticated salesperson could call this RPC
-- directly (outside the Server Action) with a malformed snapshot or a
-- next_status that doesn't match the content it's attached to. This adds:
--   * snapshot shape/required-field validation (mirrors
--     lib/domain/schemas.ts proposalSnapshotSchema, which is the same
--     invariant the TS service already enforces before calling this — the
--     DB should not be weaker than the client it's supposed to not have to
--     trust);
--   * change_type / changed_sections restricted to known values;
--   * next_status re-derived from the snapshot + clarification flags
--     (mirrors lib/domain/state-machine.ts computeEditableStatus) and
--     rejected if the caller's claimed next_status disagrees.
-- content_hash is intentionally left as caller-supplied: it is a
-- non-authoritative audit fingerprint (nothing branches on it), and exactly
-- replicating the TS canonical-JSON hashing algorithm in SQL would add
-- real complexity for no corresponding security benefit given RLS already
-- restricts this RPC to the proposal's own owner.

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
  v_client jsonb;
  v_content jsonb;
  v_flags jsonb;
  v_flag jsonb;
  v_section text;
  v_derived_next_status text;
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

  if p_change_type not in ('initial_generation', 'manual_edit', 'section_regeneration') then
    raise exception 'VALIDATION_ERROR: invalid change type %', p_change_type;
  end if;

  if p_changed_sections is not null then
    foreach v_section in array p_changed_sections loop
      if v_section not in (
        'introduction', 'projectScope', 'recommendedApproach', 'deliverables',
        'nextSteps', 'timeline', 'pricing', 'clientDetails'
      ) then
        raise exception 'VALIDATION_ERROR: invalid changed section %', v_section;
      end if;
    end loop;
  end if;

  if p_snapshot is null then
    raise exception 'VALIDATION_ERROR: snapshot is required';
  end if;

  -- Mirrors lib/domain/schemas.ts proposalSnapshotSchema: the DB should
  -- enforce at least the same shape the TS service already validates before
  -- ever reaching here, since an authenticated caller can reach this RPC
  -- directly.
  v_client := p_snapshot->'client';
  v_content := p_snapshot->'content';

  if v_client is null or v_content is null then
    raise exception 'VALIDATION_ERROR: snapshot must include client and content';
  end if;

  if coalesce(trim(v_client->>'clientName'), '') = '' then
    raise exception 'VALIDATION_ERROR: client name is required';
  end if;
  if coalesce(trim(v_client->>'companyName'), '') = '' then
    raise exception 'VALIDATION_ERROR: company name is required';
  end if;
  if coalesce(trim(v_client->>'salespersonName'), '') = '' then
    raise exception 'VALIDATION_ERROR: salesperson name is required';
  end if;
  if v_client->>'dateOfCall' is null then
    raise exception 'VALIDATION_ERROR: date of call must be present (may be blank)';
  end if;

  if coalesce(trim(v_content->>'introduction'), '') = '' then
    raise exception 'VALIDATION_ERROR: introduction is required'; end if;
  if coalesce(trim(v_content->>'projectScope'), '') = '' then
    raise exception 'VALIDATION_ERROR: project scope is required'; end if;
  if coalesce(trim(v_content->>'recommendedApproach'), '') = '' then
    raise exception 'VALIDATION_ERROR: recommended approach is required'; end if;
  if jsonb_typeof(v_content->'deliverables') is distinct from 'array'
     or jsonb_array_length(v_content->'deliverables') = 0 then
    raise exception 'VALIDATION_ERROR: at least one deliverable is required';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(v_content->'deliverables') d where trim(d) = ''
  ) then
    raise exception 'VALIDATION_ERROR: deliverables may not contain a blank entry';
  end if;
  if coalesce(trim(v_content->>'timeline'), '') = '' then
    raise exception 'VALIDATION_ERROR: timeline is required'; end if;
  if coalesce(trim(v_content->>'pricing'), '') = '' then
    raise exception 'VALIDATION_ERROR: pricing is required'; end if;
  if coalesce(trim(v_content->>'nextSteps'), '') = '' then
    raise exception 'VALIDATION_ERROR: next steps is required'; end if;

  v_flags := coalesce(p_clarification_flags, '[]'::jsonb);
  if jsonb_typeof(v_flags) is distinct from 'array' then
    raise exception 'VALIDATION_ERROR: clarification flags must be an array';
  end if;
  for v_flag in select jsonb_array_elements(v_flags) loop
    if coalesce(trim(v_flag->>'message'), '') = '' then
      raise exception 'VALIDATION_ERROR: every clarification flag needs a message';
    end if;
  end loop;

  -- Mirrors lib/domain/state-machine.ts computeEditableStatus: a version
  -- moves to needs_clarification exactly when an AI clarification flag is
  -- still open (every required-field case above is already a hard reject,
  -- not a soft "needs_clarification" state), never at the caller's
  -- discretion.
  v_derived_next_status := case when jsonb_array_length(v_flags) > 0 then 'needs_clarification' else 'draft' end;

  if p_next_status is distinct from v_derived_next_status then
    raise exception 'VALIDATION_ERROR: next_status % does not match the derived status % for this snapshot/flags',
      p_next_status, v_derived_next_status;
  end if;

  if p_next_status not in ('draft', 'needs_clarification') then
    raise exception 'VALIDATION_ERROR: invalid next status %', p_next_status;
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
    coalesce(p_changed_sections, '{}'), p_revision_instruction, v_flags, auth.uid()
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
