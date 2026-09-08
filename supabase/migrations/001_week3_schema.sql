-- Week 3 AI Proposal / Document Application — core schema
-- See week-3/SYSTEM-DESIGN-NEXTJS.md §3 for the authoritative spec this implements.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('salesperson', 'approver')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------

create table proposals (
  id uuid primary key default gen_random_uuid(),

  -- intake / discovery fields
  client_name text not null default '',
  client_email text null,
  company_name text not null default '',
  date_of_call date null,
  salesperson_name text not null default '',
  client_needs_summary text not null default '',
  project_scope text not null default '',
  goals_and_objectives text not null default '',
  recommended_services text not null default '',
  proposed_timeline text not null default '',
  estimated_pricing text not null default '',

  -- workflow fields
  created_by uuid not null references profiles(user_id),
  status text not null default 'draft' check (
    status in ('draft', 'needs_clarification', 'pending_approval', 'approved', 'changes_requested', 'delivered')
  ),
  current_version_id uuid null,
  approval_submitted_at timestamptz null,
  approval_submitted_by uuid null references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proposals_created_by_idx on proposals (created_by);
create index proposals_status_idx on proposals (status);

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger proposals_set_updated_at
  before update on proposals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- proposal_versions
-- ---------------------------------------------------------------------------

create table proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  content_hash text not null,
  change_type text not null check (change_type in ('initial_generation', 'manual_edit', 'section_regeneration')),
  changed_section text null,
  revision_instruction text null,
  clarification_flags jsonb not null default '[]'::jsonb,
  created_by uuid not null references profiles(user_id),
  pdf_status text not null default 'not_generated' check (pdf_status in ('not_generated', 'generating', 'ready', 'failed')),
  pdf_storage_path text null,
  pdf_sha256 text null,
  pdf_generated_at timestamptz null,
  pdf_error text null,
  created_at timestamptz not null default now(),
  unique (proposal_id, version_number)
);

create index proposal_versions_proposal_id_idx on proposal_versions (proposal_id);

alter table proposals
  add constraint proposals_current_version_id_fkey
  foreign key (current_version_id) references proposal_versions(id);

-- ---------------------------------------------------------------------------
-- supporting_materials
-- ---------------------------------------------------------------------------

create table supporting_materials (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path text not null unique,
  extraction_status text not null check (extraction_status in ('pending', 'ready', 'failed')),
  extracted_text text null,
  warning text null,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now()
);

create index supporting_materials_proposal_id_idx on supporting_materials (proposal_id);

-- ---------------------------------------------------------------------------
-- generation_runs
-- ---------------------------------------------------------------------------

create table generation_runs (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  base_version_id uuid null references proposal_versions(id),
  output_version_id uuid null references proposal_versions(id),
  provider text not null check (provider in ('anthropic', 'google')),
  model text not null,
  operation text not null check (operation in ('initial_generation', 'section_regeneration')),
  target_section text null,
  status text not null check (status in ('running', 'succeeded', 'failed', 'stale')),
  latency_ms integer null,
  input_tokens integer null,
  output_tokens integer null,
  material_usage jsonb not null default '[]'::jsonb,
  error text null,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  finished_at timestamptz null
);

create index generation_runs_proposal_id_idx on generation_runs (proposal_id);

-- ---------------------------------------------------------------------------
-- approvals
-- ---------------------------------------------------------------------------

create table approvals (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  version_id uuid not null references proposal_versions(id),
  decision text not null check (decision in ('approved', 'changes_requested')),
  approver_id uuid not null references profiles(user_id),
  comments text null,
  created_at timestamptz not null default now()
);

create index approvals_proposal_id_idx on approvals (proposal_id);

-- ---------------------------------------------------------------------------
-- delivery_attempts
-- ---------------------------------------------------------------------------

create table delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  version_id uuid not null references proposal_versions(id),
  recipient text not null,
  status text not null check (status in ('pending', 'sent', 'failed', 'uncertain')),
  provider text not null,
  provider_message_id text null,
  idempotency_key text not null unique,
  error text null,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index delivery_attempts_proposal_id_idx on delivery_attempts (proposal_id);

create trigger delivery_attempts_set_updated_at
  before update on delivery_attempts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- storage buckets (private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('proposal-supporting-material', 'proposal-supporting-material', false),
  ('proposal-final-documents', 'proposal-final-documents', false)
on conflict (id) do nothing;
