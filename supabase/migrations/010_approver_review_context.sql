-- get_review_materials_context
--
-- The Approver deliberately cannot read supporting_materials or
-- generation_runs directly (both are owner-only RLS, same boundary as
-- proposal_versions) — but review quality suffers without knowing which
-- uploaded files actually informed which sections. This returns only safe,
-- narrow metadata (filenames, which sections a run touched, which sections
-- a material informed) — never file content, never AI prompt/response text
-- — so the app layer can compute a "Sources used / AI-grounded sections"
-- summary without reopening the broader restriction.

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

  if v_status not in ('pending_approval', 'changes_requested', 'approved') then
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
