-- get_review_materials_context (migration 010) had its own copy of the
-- approver-viewable-status whitelist, which was missed when `delivered`
-- was added to APPROVER_VIEWABLE_STATUSES on the app side (an approver's
-- own approval history should remain visible after the salesperson moves
-- a proposal on to Delivered) — this RPC still rejected delivered
-- proposals outright, breaking the approver review page for exactly that
-- case.

create or replace function get_review_materials_context(
  p_proposal_id uuid
) returns jsonb as $$
declare
  v_status text;
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

  return jsonb_build_object(
    'versions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', pv.id,
        'versionNumber', pv.version_number,
        'changeType', pv.change_type,
        'changedSections', pv.changed_sections
      ) order by pv.version_number asc), '[]'::jsonb)
      from proposal_versions pv
      where pv.proposal_id = p_proposal_id
    ),
    'generationRuns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'outputVersionId', gr.output_version_id,
        'materialUsage', gr.material_usage
      )), '[]'::jsonb)
      from generation_runs gr
      where gr.proposal_id = p_proposal_id and gr.status = 'succeeded' and gr.output_version_id is not null
    ),
    'materials', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', sm.id,
        'filename', sm.filename
      )), '[]'::jsonb)
      from supporting_materials sm
      where sm.proposal_id = p_proposal_id
    )
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function get_review_materials_context from public, anon;
grant execute on function get_review_materials_context to authenticated;
