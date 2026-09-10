-- get_review_material_text
--
-- Lets an Approver open the actual extracted text of a supporting-material
-- file that the review context panel (migration 010) already told them was
-- cited grounding some section — closing the loop the independent review
-- suggested ("optionally allow opening the underlying support file").
-- Deliberately narrower than "any file for this proposal": it only returns
-- text for a material that was actually cited in at least one succeeded
-- generation run for this proposal, not merely uploaded. Never returns raw
-- file bytes or storage paths — only the same extracted text the AI itself
-- read, which is already what "Sources used" implies was seen.

create or replace function get_review_material_text(
  p_proposal_id uuid,
  p_material_id uuid
) returns jsonb as $$
declare
  v_status text;
  v_material record;
  v_cited boolean;
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

  select exists (
    select 1
    from generation_runs gr, jsonb_array_elements(gr.material_usage) u
    where gr.proposal_id = p_proposal_id
      and gr.status = 'succeeded'
      and u->>'materialId' = p_material_id::text
  ) into v_cited;

  if not v_cited then
    raise exception 'PERMISSION_DENIED: this material was not cited in any generated content for this proposal';
  end if;

  return jsonb_build_object('filename', v_material.filename, 'extractedText', v_material.extracted_text);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function get_review_material_text from public, anon;
grant execute on function get_review_material_text to authenticated;
