// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import * as materialsRepo from "@/lib/repositories/materials";
import type { CurrentUser } from "@/lib/auth/current-user";

const mockGenerate = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  getProvider: () => ({ generate: mockGenerate, regenerateSection: vi.fn() }),
  defaultModelFor: () => "mock-model",
}));

const { generateInitialDraft } = await import("@/lib/ai/service");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

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
  latencyMs: 42,
  inputTokens: 10,
  outputTokens: 20,
};

describe.skipIf(!hasCredentials)("initial generation (hosted Supabase integration, mocked provider)", () => {
  let supabase: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let user: CurrentUser;
  const proposalIds: string[] = [];

  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: "sales.demo@koyatalent.test",
      password: "DemoSales123!",
    });
    if (error) throw error;
    user = { userId: data.user!.id, email: data.user!.email!, fullName: "Sam Rep", role: "salesperson" };
  });

  afterAll(async () => {
    if (proposalIds.length > 0) await admin.from("proposals").delete().in("id", proposalIds);
  });

  async function freshProposal(overrides: Partial<proposalsRepo.ProposalRow> = {}) {
    const proposal = await proposalsRepo.createProposal(supabase, user.userId, user.fullName);
    proposalIds.push(proposal.id);
    if (Object.keys(overrides).length > 0) {
      await admin.from("proposals").update(overrides).eq("id", proposal.id);
    }
    return proposal;
  }

  const completeIntakeFields = {
    client_name: "Jane Doe",
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

  it("does not call the provider when a generation blocker is present", async () => {
    mockGenerate.mockClear();
    const proposal = await freshProposal({ ...completeIntakeFields, project_scope: "" });

    await expect(generateInitialDraft(supabase, proposal.id, "anthropic", user)).rejects.toMatchObject({
      code: "READINESS_ERROR",
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("does not call the provider while a material is still pending or failed", async () => {
    mockGenerate.mockClear();
    const proposal = await freshProposal(completeIntakeFields);
    await materialsRepo.insertMaterial(supabase, {
      id: crypto.randomUUID(),
      proposalId: proposal.id,
      filename: "broken.docx",
      mimeType: "application/octet-stream",
      sizeBytes: 10,
      storagePath: `${user.userId}/${proposal.id}/x/broken.docx`,
      createdBy: user.userId,
    });
    await admin
      .from("supporting_materials")
      .update({ extraction_status: "failed", warning: "could not parse" })
      .eq("proposal_id", proposal.id);

    await expect(generateInitialDraft(supabase, proposal.id, "anthropic", user)).rejects.toMatchObject({
      code: "READINESS_ERROR",
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("creates Version 1 and a succeeded generation run on valid output", async () => {
    mockGenerate.mockClear();
    mockGenerate.mockResolvedValueOnce(VALID_AI_RESULT);
    const proposal = await freshProposal(completeIntakeFields);

    const version = await generateInitialDraft(supabase, proposal.id, "anthropic", user);

    expect(version.version_number).toBe(1);
    expect(version.change_type).toBe("initial_generation");
    expect(version.snapshot.content.timeline).toBe("6 weeks");
    expect(version.snapshot.content.pricing).toBe("$12,000");
    expect(version.snapshot.content.introduction).toBe("AI intro");

    const { data: updatedProposal } = await admin.from("proposals").select("current_version_id, status").eq("id", proposal.id).single();
    expect(updatedProposal?.current_version_id).toBe(version.id);
    expect(updatedProposal?.status).toBe("draft");

    const { data: runs } = await admin.from("generation_runs").select().eq("proposal_id", proposal.id);
    expect(runs).toHaveLength(1);
    expect(runs![0].status).toBe("succeeded");
    expect(runs![0].output_version_id).toBe(version.id);
  });

  it("creates no version and marks the run failed when AI output is invalid", async () => {
    mockGenerate.mockClear();
    mockGenerate.mockResolvedValueOnce({ ...VALID_AI_RESULT, data: { ...VALID_AI_RESULT.data, deliverables: [] } });
    const proposal = await freshProposal(completeIntakeFields);

    // The provider adapter itself would normally throw AI_OUTPUT_INVALID before
    // returning; since we mock getProvider directly, simulate that by having
    // the mock throw, matching what the real adapters do on schema failure.
    mockGenerate.mockReset();
    mockGenerate.mockRejectedValueOnce(new Error("AI_OUTPUT_INVALID: invalid deliverables"));

    await expect(generateInitialDraft(supabase, proposal.id, "anthropic", user)).rejects.toThrow();

    const { data: updatedProposal } = await admin.from("proposals").select("current_version_id").eq("id", proposal.id).single();
    expect(updatedProposal?.current_version_id).toBeNull();

    const { data: runs } = await admin.from("generation_runs").select().eq("proposal_id", proposal.id);
    expect(runs).toHaveLength(1);
    expect(runs![0].status).toBe("failed");
  });

  it("blocks generation when aggregate supporting material exceeds 60,000 characters", async () => {
    mockGenerate.mockClear();
    const proposal = await freshProposal(completeIntakeFields);
    await materialsRepo.insertMaterial(supabase, {
      id: crypto.randomUUID(),
      proposalId: proposal.id,
      filename: "huge.txt",
      mimeType: "text/plain",
      sizeBytes: 70_000,
      storagePath: `${user.userId}/${proposal.id}/y/huge.txt`,
      createdBy: user.userId,
    });
    await admin
      .from("supporting_materials")
      .update({ extraction_status: "ready", extracted_text: "a".repeat(70_000) })
      .eq("proposal_id", proposal.id);

    await expect(generateInitialDraft(supabase, proposal.id, "anthropic", user)).rejects.toMatchObject({
      code: "READINESS_ERROR",
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
