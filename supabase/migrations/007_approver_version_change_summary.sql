-- list_version_changes_for_approver
--
-- Approvers deliberately cannot read arbitrary historical proposal_versions
-- rows (proposal_versions_select_approver in 002_week3_rls.sql only allows
-- the current version of a pending proposal, or a version they personally
-- decided on) — that's an intentional boundary: an approver reviews the
-- exact submitted version, not the salesperson's full editing history.
--
-- But on a resubmission after "Request Changes", the approver has a real,
-- narrow need: "what changed since I last reviewed this?" This function
-- answers exactly that, as metadata only (version number, change type,
-- which section) — never snapshot content — so it doesn't reopen the
-- broader restriction, it just answers one specific, safe question.

create or replace function list_version_changes_for_approver(
  p_proposal_id uuid,
  p_since_version_number int
) returns table(
  version_number int,
  change_type text,
  changed_section text,
  created_at timestamptz
) as $$
begin
  if not current_role_is('approver') then
    raise exception 'PERMISSION_DENIED: only an approver can call this';
  end if;

  return query
    select pv.version_number, pv.change_type, pv.changed_section, pv.created_at
    from proposal_versions pv
    where pv.proposal_id = p_proposal_id and pv.version_number > p_since_version_number
    order by pv.version_number asc;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function list_version_changes_for_approver from public, anon;
grant execute on function list_version_changes_for_approver to authenticated;
