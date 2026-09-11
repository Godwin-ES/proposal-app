-- Lets a salesperson declare, before the first generation, that supporting
-- material already contains the answers to some intake fields — so
-- generation may proceed even though those fields are blank, drawing them
-- from supporting material instead (see evaluateGenerationReadiness and
-- composeInitialSnapshot in the app). Mirrors update_pre_generation_intake's
-- own scoping: only settable pre-generation, same as the intake fields
-- themselves, since the concept has no meaning once a version already exists.

alter table proposals
  add column document_provides_fields boolean not null default false;

create function update_document_provides_fields(
  p_proposal_id uuid,
  p_document_provides_fields boolean
) returns proposals as $$
declare
  v_proposal proposals;
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

  if v_proposal.current_version_id is not null then
    raise exception 'INVALID_STATE: this can only be set before the first proposal version exists';
  end if;

  if v_proposal.status not in ('draft', 'needs_clarification') then
    raise exception 'INVALID_STATE: proposal is not editable (status: %)', v_proposal.status;
  end if;

  update proposals set document_provides_fields = p_document_provides_fields
  where id = p_proposal_id
  returning * into v_proposal;

  return v_proposal;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function update_document_provides_fields(uuid, boolean) from public, anon;
grant execute on function update_document_provides_fields(uuid, boolean) to authenticated;
