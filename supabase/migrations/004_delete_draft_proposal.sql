-- delete_draft_proposal
--
-- proposals has no DELETE policy (see 002_week3_rls.sql: "all workflow/content
-- mutations go through the security-definer RPCs"), so deletion has to be a
-- dedicated RPC like every other proposal mutation. Restricted to statuses with
-- no approval history (draft, needs_clarification) — a proposal that has been
-- through approval has a decision recorded in `approvals`, which cascades away
-- with the proposal row, and that audit trail should not be erasable by the
-- salesperson who owns the proposal.
--
-- This only deletes the `proposals` row (and, via ON DELETE CASCADE, its
-- proposal_versions/supporting_materials/generation_runs rows). Storage
-- objects are not reachable from SQL at all (see lib/storage/cleanup.ts) and
-- must be removed by the caller through the Storage API before invoking this.

create or replace function delete_draft_proposal(
  p_proposal_id uuid
) returns void as $$
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

  if v_proposal.status not in ('draft', 'needs_clarification') then
    raise exception 'INVALID_STATE: proposal cannot be deleted in its current status (%)', v_proposal.status;
  end if;

  delete from proposals where id = p_proposal_id;
end;
$$ language plpgsql security definer set search_path = public;
