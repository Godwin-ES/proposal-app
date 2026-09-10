-- Supporting material should stay uploadable/removable on an approved
-- proposal, matching section regeneration's own gate
-- (assertVersionWritableStatus in lib/materials/service.ts) — otherwise a
-- salesperson revising an approved proposal with a newly relevant document
-- could regenerate a section (already permitted post-approval) but never
-- actually attach the file that should inform it. This trigger enforced the
-- narrower pre-approval-only rule independently at the database level, so
-- the application-layer fix alone wasn't enough.

create or replace function guard_supporting_materials_editable() returns trigger as $$
declare
  proposal_status text;
begin
  select status into proposal_status from proposals where id = coalesce(new.proposal_id, old.proposal_id);
  if proposal_status not in ('draft', 'needs_clarification', 'changes_requested', 'approved') then
    raise exception 'Supporting material can only be changed while the proposal is editable (current status: %)', proposal_status
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;
