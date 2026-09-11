-- Centralized log of unexpected/system-level errors (AI failures, delivery
-- failures, document generation failures, storage failures, etc.) surfaced
-- to a Discord channel from the app layer (see lib/notifications/). This
-- table is the durable record; Discord is just a live alert on top of it.
-- Deliberately excludes routine/expected errors (validation, permission,
-- stale-version, invalid-state) — those are normal user-facing outcomes,
-- not incidents worth paging anyone about.

create table error_logs (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references proposals(id) on delete set null,
  stage text not null,
  code text not null,
  message text not null,
  role text,
  created_by uuid references profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index error_logs_created_at_idx on error_logs(created_at desc);
create index error_logs_proposal_id_idx on error_logs(proposal_id);

alter table error_logs enable row level security;

-- Any authenticated user may log an error attributed to themselves — this
-- is a write-only audit/alerting sink from the app's point of view, not
-- something the UI reads back, so there's no need for a broader select
-- policy beyond "see your own."
create policy error_logs_insert_own on error_logs
  for insert to authenticated
  with check (created_by = auth.uid());

create policy error_logs_select_own on error_logs
  for select to authenticated
  using (created_by = auth.uid());
