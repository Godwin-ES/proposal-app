-- get_review_material_text: drop the "must be cited" restriction.
--
-- "Sources used" now lists every material ever uploaded to a proposal, not
-- only ones the AI actually cited (see lib/domain/material-attribution.ts)
-- — an Approver should be able to check a file the AI flagged as irrelevant
-- and correctly never used, not just the ones that "worked". This function
-- previously re-enforced the old "must be cited" rule independently, which
-- would now reject viewing exactly that kind of file. The remaining checks
-- (role, proposal review-visibility, material belongs to this proposal)
-- are unchanged and still the real authorization boundary.

create or replace function get_review_material_text(
  p_proposal_id uuid,
  p_material_id uuid
) returns jsonb as $$
declare
  v_status text;
  v_material record;
begin
  if not current_role_is('approver') then
    raise exception 'PERMISSION_DENIED: only an approver can call this';
  end if;

  select status into v_status from proposals where id = p_proposal_id;

  if v_status is null then
    raise exception 'NOT_FOUND: proposal % does not exist', p_proposal_id;
  end if;

  if v_status not in ('pending_approval', 'changes_requested', 'approved', 'delivered') then
    raise exception 'PERMISSION_DENIED: this proposal is not available for review';
  end if;

  select id, filename, extracted_text into v_material
  from supporting_materials
  where id = p_material_id and proposal_id = p_proposal_id;

  if v_material.id is null then
    raise exception 'NOT_FOUND: this material does not belong to this proposal';
  end if;

  return jsonb_build_object('filename', v_material.filename, 'extractedText', v_material.extracted_text);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function get_review_material_text from public, anon;
grant execute on function get_review_material_text to authenticated;
