-- dismiss_clarification_flag
--
-- Removes one AI-raised clarification flag from the proposal's CURRENT
-- version without creating a new version — dismissing is an acknowledgement
-- that a flagged concern isn't actually a problem (e.g. the AI flagged a
-- conflict with an outdated supporting document), not a change to the
-- proposal's content. Content immutability protects what the client will
-- see; this is process metadata about that content, so it's fine for it to
-- be mutable in place.
--
-- Only the current version's flags are actionable — dismissing on an old,
-- superseded version would silently do nothing useful and could confuse the
-- "does this version still have unresolved flags" check elsewhere.
--
-- If removing the flag empties the array, the proposal returns to 'draft'.
-- This does not re-run full approval-readiness logic: a stored version's
-- content is already guaranteed non-blank by the AI/manual-edit schemas, so
-- the only thing that could still keep it out of 'draft' is another
-- unresolved flag, which this query already accounts for.

create or replace function dismiss_clarification_flag(
  p_proposal_id uuid,
  p_version_id uuid,
  p_flag_id text
) returns proposal_versions as $$
declare
  v_proposal proposals;
  v_version proposal_versions;
  v_next_flags jsonb;
begin
  select * into v_proposal from proposals where id = p_proposal_id for update;

  if v_proposal.id is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_proposal.created_by <> auth.uid() then
    raise exception 'PERMISSION_DENIED: you do not own this proposal';
  end if;

  if v_proposal.current_version_id is distinct from p_version_id then
    raise exception 'STALE_VERSION: this is no longer the current version';
  end if;

  select * into v_version from proposal_versions where id = p_version_id for update;

  if v_version.id is null then
    raise exception 'NOT_FOUND: proposal version % does not exist', p_version_id;
  end if;

  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  into v_next_flags
  from jsonb_array_elements(v_version.clarification_flags) elem
  where elem->>'id' <> p_flag_id;

  update proposal_versions set clarification_flags = v_next_flags
  where id = p_version_id
  returning * into v_version;

  if jsonb_array_length(v_next_flags) = 0 and v_proposal.status = 'needs_clarification' then
    update proposals set status = 'draft' where id = p_proposal_id;
  end if;

  return v_version;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function dismiss_clarification_flag from public, anon;
grant execute on function dismiss_clarification_flag to authenticated;
