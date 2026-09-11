// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import * as approvalsRepo from "@/lib/repositories/approvals";
import { saveManualRevision } from "@/lib/proposals/version-service";
import { generateInitialDraft } from "@/lib/ai/service";
import type { CurrentUser } from "@/lib/auth/current-user";
import { vi } from "vitest";
import { salesTestAccount, approverTestAccount, hasTestAccountCredentials } from "@/tests/helpers/test-accounts";

const mockGenerate = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  getProvider: () => ({ generate: mockGenerate, regenerateSection: vi.fn() }),
}));

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

describe.skipIf(!hasCredentials)("immutable versioning (hosted Supabase integration, mocked provider)", () => {
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

  async function generatedProposal() {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update(COMPLETE_INTAKE).eq("id", proposal.id);
    mockGenerate.mockResolvedValueOnce(VALID_AI_RESULT);
    const version = await generateInitialDraft(salesClient, proposal.id, "claude-sonnet-5", salesUser);
    return { proposalId: proposal.id, version };
  }

  it("creates version N+1 and preserves every unchanged field exactly", async () => {
    const { proposalId, version } = await generatedProposal();

    const nextSnapshot = { ...version.snapshot, content: { ...version.snapshot.content, introduction: "Manually corrected intro." } };
    const v2 = await saveManualRevision(salesClient, proposalId, version.id, nextSnapshot, salesUser);

    expect(v2.version_number).toBe(2);
    expect(v2.content_hash).not.toBe(version.content_hash);
    expect(v2.snapshot.content.introduction).toBe("Manually corrected intro.");
    expect(v2.snapshot.content.projectScope).toBe(version.snapshot.content.projectScope);
    expect(v2.snapshot.content.timeline).toBe(version.snapshot.content.timeline);
    expect(v2.snapshot.content.pricing).toBe(version.snapshot.content.pricing);
    expect(v2.snapshot.client).toEqual(version.snapshot.client);
  });

  it("rejects a stale expected version", async () => {
    const { proposalId, version } = await generatedProposal();
    // Advance to v2 first.
    await saveManualRevision(salesClient, proposalId, version.id, version.snapshot, salesUser);

    // Now try to save again against the stale v1 id.
    await expect(
      saveManualRevision(salesClient, proposalId, version.id, version.snapshot, salesUser)
    ).rejects.toMatchObject({ code: "STALE_VERSION" });
  });

  it("rejects an edit while pending approval", async () => {
    const { proposalId, version } = await generatedProposal();
    await approvalsRepo.submitForApproval(salesClient, proposalId, version.id);

    await expect(
      saveManualRevision(salesClient, proposalId, version.id, version.snapshot, salesUser)
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("makes a later version unapproved and blocks delivery readiness after approval", async () => {
    const { proposalId, version } = await generatedProposal();
    await approvalsRepo.submitForApproval(salesClient, proposalId, version.id);
    await approvalsRepo.decideApproval(approverClient, {
      proposalId,
      versionId: version.id,
      decision: "approved",
      comments: null,
    });

    const { data: approvedProposal } = await admin.from("proposals").select("status").eq("id", proposalId).single();
    expect(approvedProposal?.status).toBe("approved");

    // Salesperson revises after approval -> new version, no longer approved.
    const nextSnapshot = { ...version.snapshot, content: { ...version.snapshot.content, pricing: "$15,000" } };
    const v2 = await saveManualRevision(salesClient, proposalId, version.id, nextSnapshot, salesUser);

    const { data: afterEdit } = await admin.from("proposals").select("status, current_version_id").eq("id", proposalId).single();
    expect(afterEdit?.current_version_id).toBe(v2.id);
    expect(afterEdit?.status).not.toBe("approved");

    const { data: approvalsForV2 } = await admin.from("approvals").select().eq("version_id", v2.id);
    expect(approvalsForV2).toHaveLength(0);
  });
});
