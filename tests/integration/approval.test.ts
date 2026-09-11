// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import type { CurrentUser } from "@/lib/auth/current-user";
import { salesTestAccount, approverTestAccount, hasTestAccountCredentials } from "@/tests/helpers/test-accounts";

const mockGenerate = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  getProvider: () => ({ generate: mockGenerate, regenerateSection: vi.fn() }),
}));

const { generateInitialDraft } = await import("@/lib/ai/service");
const { submitProposalForApproval, decideProposalApproval } = await import("@/lib/approvals/service");
const { saveManualRevision } = await import("@/lib/proposals/version-service");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY) && hasTestAccountCredentials();

const VALID_AI_RESULT = {
  data: {
    introduction: "AI intro",
    projectScope: "AI scope",
    recommendedApproach: "AI approach",
    deliverables: ["AI deliverable"],
    clarificationFlags: [],
    supportingMaterialUsage: [],
    fieldsFromMaterial: { clientName: null, companyName: null, timeline: null, pricing: null },
  },
  provider: "anthropic" as const,
  model: "mock-model",
  latencyMs: 1,
  inputTokens: 1,
  outputTokens: 1,
};

const COMPLETE_INTAKE = {
  client_name: "Jane Doe",
  client_email: "jane@acme.test",
  company_name: "Acme Co",
  salesperson_name: "Sam Rep",
  client_needs_summary: "Faster onboarding",
  project_scope: "Build onboarding portal",
  goals_and_objectives: "Reduce onboarding time",
  date_of_call: "2026-01-15",
  recommended_services: "Portal + training",
  proposed_timeline: "6 weeks",
  estimated_pricing: "$12,000",
};

describe.skipIf(!hasCredentials)("approval workflow (hosted Supabase integration)", () => {
  let salesClient: SupabaseClient<Database>;
  let approverClient: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let salesUser: CurrentUser;
  const proposalIds: string[] = [];

  beforeAll(async () => {
    salesClient = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    approverClient = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data, error } = await salesClient.auth.signInWithPassword({
      ...salesTestAccount(),
    });
    if (error) throw error;
    salesUser = { userId: data.user!.id, email: data.user!.email!, fullName: "Sam Rep", role: "salesperson" };

    const { error: approverError } = await approverClient.auth.signInWithPassword({
      ...approverTestAccount(),
    });
    if (approverError) throw approverError;
  });

  afterAll(async () => {
    if (proposalIds.length > 0) await admin.from("proposals").delete().in("id", proposalIds);
  });

  async function generatedProposal(overrides: Partial<proposalsRepo.ProposalRow> = {}) {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update({ ...COMPLETE_INTAKE, ...overrides }).eq("id", proposal.id);
    mockGenerate.mockResolvedValueOnce(VALID_AI_RESULT);
    const version = await generateInitialDraft(salesClient, proposal.id, "claude-sonnet-5", salesUser);
    return { proposalId: proposal.id, version };
  }

  it("blocks generation itself when a required intake field is missing (pricing)", async () => {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update({ ...COMPLETE_INTAKE, estimated_pricing: "" }).eq("id", proposal.id);
    mockGenerate.mockResolvedValueOnce(VALID_AI_RESULT);

    await expect(
      generateInitialDraft(salesClient, proposal.id, "claude-sonnet-5", salesUser)
    ).rejects.toMatchObject({ code: "READINESS_ERROR" });
  });

  it("submits successfully and records submission metadata", async () => {
    const { proposalId, version } = await generatedProposal();

    await submitProposalForApproval(salesClient, proposalId, version.id, salesUser);

    const { data: proposal } = await admin
      .from("proposals")
      .select("status, approval_submitted_at, approval_submitted_by")
      .eq("id", proposalId)
      .single();
    expect(proposal?.status).toBe("pending_approval");
    expect(proposal?.approval_submitted_at).toBeTruthy();
    expect(proposal?.approval_submitted_by).toBe(salesUser.userId);
  });

  it("rejects an edit while pending approval, server-side", async () => {
    const { proposalId, version } = await generatedProposal();
    await submitProposalForApproval(salesClient, proposalId, version.id, salesUser);

    await expect(
      saveManualRevision(salesClient, proposalId, version.id, version.snapshot, salesUser)
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("rejects self-approval and rejects approval by the wrong role", async () => {
    const { proposalId, version } = await generatedProposal();
    await submitProposalForApproval(salesClient, proposalId, version.id, salesUser);

    // Salesperson (wrong role) cannot decide.
    await expect(
      decideProposalApproval(salesClient, { proposalId, versionId: version.id, decision: "approved", comments: null })
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("approves via the independent approver and binds the decision to the exact version", async () => {
    const { proposalId, version } = await generatedProposal();
    await submitProposalForApproval(salesClient, proposalId, version.id, salesUser);

    const decision = await decideProposalApproval(approverClient, {
      proposalId,
      versionId: version.id,
      decision: "approved",
      comments: "Looks great",
    });
    expect(decision.decision).toBe("approved");
    expect(decision.version_id).toBe(version.id);

    const { data: proposal } = await admin.from("proposals").select("status").eq("id", proposalId).single();
    expect(proposal?.status).toBe("approved");
  });

  it("supports request changes, returning the proposal to an editable state", async () => {
    const { proposalId, version } = await generatedProposal();
    await submitProposalForApproval(salesClient, proposalId, version.id, salesUser);

    await decideProposalApproval(approverClient, {
      proposalId,
      versionId: version.id,
      decision: "changes_requested",
      comments: "Please adjust the timeline.",
    });

    const { data: proposal } = await admin.from("proposals").select("status").eq("id", proposalId).single();
    expect(proposal?.status).toBe("changes_requested");

    // Salesperson can revise again from changes_requested.
    const revised = { ...version.snapshot, content: { ...version.snapshot.content, timeline: "8 weeks" } };
    const v2 = await saveManualRevision(salesClient, proposalId, version.id, revised, salesUser);
    expect(v2.version_number).toBe(2);
  });

  it("blocks resubmitting the exact version an approver already sent back, but allows it after a revision", async () => {
    const { proposalId, version } = await generatedProposal();
    await submitProposalForApproval(salesClient, proposalId, version.id, salesUser);
    await decideProposalApproval(approverClient, {
      proposalId,
      versionId: version.id,
      decision: "changes_requested",
      comments: "Please adjust the timeline.",
    });

    // Resubmitting the identical, unrevised version is rejected.
    await expect(
      submitProposalForApproval(salesClient, proposalId, version.id, salesUser)
    ).rejects.toMatchObject({ code: "READINESS_ERROR" });

    const { data: stillChangesRequested } = await admin.from("proposals").select("status").eq("id", proposalId).single();
    expect(stillChangesRequested?.status).toBe("changes_requested");

    // Once revised, resubmission is allowed again.
    const revised = { ...version.snapshot, content: { ...version.snapshot.content, timeline: "10 weeks" } };
    const v2 = await saveManualRevision(salesClient, proposalId, version.id, revised, salesUser);
    await submitProposalForApproval(salesClient, proposalId, v2.id, salesUser);

    const { data: pendingAgain } = await admin.from("proposals").select("status").eq("id", proposalId).single();
    expect(pendingAgain?.status).toBe("pending_approval");
  });

  it("rejects a decision against a stale (non-current) version", async () => {
    const { proposalId, version } = await generatedProposal();
    await submitProposalForApproval(salesClient, proposalId, version.id, salesUser);
    await decideProposalApproval(approverClient, {
      proposalId,
      versionId: version.id,
      decision: "changes_requested",
      comments: null,
    });

    // Revise to v2 and resubmit, so the proposal is pending_approval again
    // with v2 as the current version.
    const revised = { ...version.snapshot, content: { ...version.snapshot.content, timeline: "9 weeks" } };
    const v2 = await saveManualRevision(salesClient, proposalId, version.id, revised, salesUser);
    await submitProposalForApproval(salesClient, proposalId, v2.id, salesUser);

    // An approver decision against the old (v1) id must be rejected as stale,
    // not silently applied to whatever is current.
    await expect(
      decideProposalApproval(approverClient, { proposalId, versionId: version.id, decision: "approved", comments: null })
    ).rejects.toMatchObject({ code: "STALE_VERSION" });
  });
});
