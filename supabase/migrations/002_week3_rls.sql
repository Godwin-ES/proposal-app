-- Week 3 AI Proposal / Document Application — row level security
-- See week-3/SYSTEM-DESIGN-NEXTJS.md §5 / §17 for the authoritative spec this implements.
--
-- Business RPCs in 003 are `security definer` and therefore bypass RLS by
-- design; RLS here governs direct table access from the authenticated
-- Supabase client (mostly SELECT, plus a small number of INSERT paths that
-- do not need workflow-state transitions).
--
-- Cross-table policy checks (e.g. "is this version's proposal owned by me")
-- are expressed through `security definer` helper functions rather than
-- inline subqueries on another RLS-protected table. A plain inline subquery
-- into an RLS-protected table re-triggers that table's own policies, and
-- because proposals/approvals/versions reference each other, that produces
-- infinite recursion. A security-definer helper runs as the function owner
-- (the table owner), which bypasses RLS for its internal query, breaking
-- the cycle while still deriving the actor from auth.uid() inside.

create or replace function current_role_is(target_role text) returns boolean as $$
  select exists (
    select 1 from profiles where user_id = auth.uid() and role = target_role
  );
$$ language sql stable security definer set search_path = public;

create or replace function proposal_owned_by_current_user(p_proposal_id uuid) returns boolean as $$
  select exists (select 1 from proposals where id = p_proposal_id and created_by = auth.uid());
$$ language sql stable security definer set search_path = public;

create or replace function proposal_is_pending_with_current_version(p_proposal_id uuid, p_version_id uuid) returns boolean as $$
  select exists (
    select 1 from proposals
    where id = p_proposal_id and status = 'pending_approval' and current_version_id = p_version_id
  );
$$ language sql stable security definer set search_path = public;

create or replace function approver_decided_proposal(p_proposal_id uuid) returns boolean as $$
  select exists (select 1 from approvals where proposal_id = p_proposal_id and approver_id = auth.uid());
$$ language sql stable security definer set search_path = public;

create or replace function approver_decided_version(p_version_id uuid) returns boolean as $$
  select exists (select 1 from approvals where version_id = p_version_id and approver_id = auth.uid());
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;

create policy profiles_select_authenticated on profiles
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------

alter table proposals enable row level security;

create policy proposals_select_owner on proposals
  for select to authenticated
  using (created_by = auth.uid());

create policy proposals_select_approver_pending on proposals
  for select to authenticated
  using (
    current_role_is('approver')
    and (status = 'pending_approval' or approver_decided_proposal(id))
  );

create policy proposals_insert_owner on proposals
  for insert to authenticated
  with check (created_by = auth.uid() and current_role_is('salesperson'));

-- No UPDATE/DELETE policy: all workflow/content mutations go through the
-- security-definer RPCs in 003_week3_business_rpcs.sql.

-- ---------------------------------------------------------------------------
-- proposal_versions
-- ---------------------------------------------------------------------------

alter table proposal_versions enable row level security;

create policy proposal_versions_select_owner on proposal_versions
  for select to authenticated
  using (proposal_owned_by_current_user(proposal_id));

create policy proposal_versions_select_approver on proposal_versions
  for select to authenticated
  using (
    current_role_is('approver')
    and (
      proposal_is_pending_with_current_version(proposal_id, id)
      or approver_decided_version(id)
    )
  );

-- No direct INSERT/UPDATE/DELETE policy: versions are immutable and are
-- only ever created/updated (pdf metadata) through security-definer RPCs.

-- ---------------------------------------------------------------------------
-- supporting_materials
-- ---------------------------------------------------------------------------

alter table supporting_materials enable row level security;

create policy supporting_materials_owner_select on supporting_materials
  for select to authenticated
  using (proposal_owned_by_current_user(proposal_id));

create policy supporting_materials_owner_insert on supporting_materials
  for insert to authenticated
  with check (created_by = auth.uid() and proposal_owned_by_current_user(proposal_id));

create policy supporting_materials_owner_update on supporting_materials
  for update to authenticated
  using (proposal_owned_by_current_user(proposal_id));

create policy supporting_materials_owner_delete on supporting_materials
  for delete to authenticated
  using (proposal_owned_by_current_user(proposal_id));

-- Defense in depth: materials may only be added/removed while the parent
-- proposal is in an editable state, even if a client bypasses UI controls.
create or replace function guard_supporting_materials_editable() returns trigger as $$
declare
  proposal_status text;
begin
  select status into proposal_status from proposals where id = coalesce(new.proposal_id, old.proposal_id);
  if proposal_status not in ('draft', 'needs_clarification', 'changes_requested') then
    raise exception 'Supporting material can only be changed while the proposal is editable (current status: %)', proposal_status
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

create trigger supporting_materials_guard_insert
  before insert on supporting_materials
  for each row execute function guard_supporting_materials_editable();

create trigger supporting_materials_guard_delete
  before delete on supporting_materials
  for each row execute function guard_supporting_materials_editable();

-- ---------------------------------------------------------------------------
-- generation_runs
-- ---------------------------------------------------------------------------

alter table generation_runs enable row level security;

create policy generation_runs_owner_select on generation_runs
  for select to authenticated
  using (proposal_owned_by_current_user(proposal_id));

create policy generation_runs_owner_insert on generation_runs
  for insert to authenticated
  with check (created_by = auth.uid() and proposal_owned_by_current_user(proposal_id));

create policy generation_runs_owner_update on generation_runs
  for update to authenticated
  using (proposal_owned_by_current_user(proposal_id));

-- ---------------------------------------------------------------------------
-- approvals
-- ---------------------------------------------------------------------------

alter table approvals enable row level security;

create policy approvals_owner_select on approvals
  for select to authenticated
  using (proposal_owned_by_current_user(proposal_id));

create policy approvals_approver_select on approvals
  for select to authenticated
  using (approver_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE policy: decisions are only recorded through
-- decide_proposal_approval, which also enforces no-self-approval.

-- ---------------------------------------------------------------------------
-- delivery_attempts
-- ---------------------------------------------------------------------------

alter table delivery_attempts enable row level security;

create policy delivery_attempts_owner_select on delivery_attempts
  for select to authenticated
  using (proposal_owned_by_current_user(proposal_id));

-- No direct INSERT/UPDATE/DELETE policy: attempts are only created/updated
-- through prepare_delivery_attempt / finalize_delivery_attempt / record_delivery_problem.

-- ---------------------------------------------------------------------------
-- storage policies
-- ---------------------------------------------------------------------------

create policy supporting_material_owner_all on storage.objects
  for all to authenticated
  using (
    bucket_id = 'proposal-supporting-material'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'proposal-supporting-material'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy final_documents_owner_all on storage.objects
  for all to authenticated
  using (
    bucket_id = 'proposal-final-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'proposal-final-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
