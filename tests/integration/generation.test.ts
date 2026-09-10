// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import * as materialsRepo from "@/lib/repositories/materials";
import type { CurrentUser } from "@/lib/auth/current-user";
import { salesTestAccount, hasTestAccountCredentials } from "@/tests/helpers/test-accounts";

const mockGenerate = vi.fn();
const mockRegenerateSection = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  getProvider: () => ({ generate: mockGenerate, regenerateSection: mockRegenerateSection }),
  defaultModelFor: () => "mock-model",
}));

const { generateInitialDraft, regenerateSectionPreview } = await import("@/lib/ai/service");
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
      ...salesTestAccount(),
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

describe.skipIf(!hasCredentials)("targeted section regeneration (hosted Supabase integration, mocked provider)", () => {
  let supabase: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let user: CurrentUser;
  const proposalIds: string[] = [];

  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data, error } = await supabase.auth.signInWithPassword({
      ...salesTestAccount(),
    });
    if (error) throw error;
    user = { userId: data.user!.id, email: data.user!.email!, fullName: "Sam Rep", role: "salesperson" };
  });

  afterAll(async () => {
    if (proposalIds.length > 0) await admin.from("proposals").delete().in("id", proposalIds);
  });

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

  async function generatedProposal() {
    const proposal = await proposalsRepo.createProposal(supabase, user.userId, user.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update(COMPLETE_INTAKE).eq("id", proposal.id);
    mockGenerate.mockResolvedValueOnce({
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
    });
    const version = await generateInitialDraft(supabase, proposal.id, "anthropic", user);
    return { proposalId: proposal.id, version };
  }

  it("produces preview content without creating a version or touching current_version_id", async () => {
    mockRegenerateSection.mockClear();
    const { proposalId, version } = await generatedProposal();

    mockRegenerateSection.mockResolvedValueOnce({
      data: { section: "deliverables", content: ["New deliverable A", "New deliverable B"], clarificationFlags: [], supportingMaterialUsage: [] },
      provider: "anthropic" as const,
      model: "mock-model",
      latencyMs: 1,
      inputTokens: 1,
      outputTokens: 1,
    });

    const preview = await regenerateSectionPreview(
      supabase,
      proposalId,
      "deliverables",
      "Add a second deliverable.",
      "anthropic",
      version.snapshot,
      user
    );

    expect(preview.snapshot.content.deliverables).toEqual(["New deliverable A", "New deliverable B"]);
    expect(preview.snapshot.content.introduction).toBe(version.snapshot.content.introduction);
    expect(preview.snapshot.content.projectScope).toBe(version.snapshot.content.projectScope);
    expect(preview.snapshot.content.recommendedApproach).toBe(version.snapshot.content.recommendedApproach);
    expect(preview.snapshot.client).toEqual(version.snapshot.client);
    expect(preview.generationRunId).toBeTruthy();

    // Nothing persisted yet: still v1, and the run has no output_version_id.
    const { data: current } = await admin.from("proposals").select("current_version_id").eq("id", proposalId).single();
    expect(current?.current_version_id).toBe(version.id);

    const { data: run } = await admin.from("generation_runs").select().eq("id", preview.generationRunId).single();
    expect(run?.status).toBe("succeeded");
    expect(run?.output_version_id).toBeNull();
  });

  it("rejects a blank revision instruction without calling the provider", async () => {
    mockRegenerateSection.mockClear();
    const { proposalId, version } = await generatedProposal();

    await expect(
      regenerateSectionPreview(supabase, proposalId, "introduction", "   ", "anthropic", version.snapshot, user)
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockRegenerateSection).not.toHaveBeenCalled();
  });

  it("marks the run failed and leaves current_version_id untouched when the provider call fails", async () => {
    mockRegenerateSection.mockClear();
    const { proposalId, version } = await generatedProposal();
    mockRegenerateSection.mockRejectedValueOnce(new Error("AI_OUTPUT_INVALID: bad output"));

    await expect(
      regenerateSectionPreview(supabase, proposalId, "introduction", "Make it punchier.", "anthropic", version.snapshot, user)
    ).rejects.toThrow();

    const { data: current } = await admin.from("proposals").select("current_version_id").eq("id", proposalId).single();
    expect(current?.current_version_id).toBe(version.id);

    const { data: runs } = await admin.from("generation_runs").select().eq("proposal_id", proposalId);
    expect(runs).toHaveLength(2); // initial generation + this failed regeneration
    expect(runs!.find((r) => r.operation === "section_regeneration")?.status).toBe("failed");
  });

  it("rejects an unsupported regeneration target before calling the provider", async () => {
    mockRegenerateSection.mockClear();
    const { proposalId, version } = await generatedProposal();

    await expect(
      regenerateSectionPreview(supabase, proposalId, "pricing" as never, "Lower it.", "anthropic", version.snapshot, user)
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockRegenerateSection).not.toHaveBeenCalled();
  });

  it("saving a regeneration's preview creates a version and links the generation_run to it", async () => {
    mockRegenerateSection.mockClear();
    const { proposalId, version } = await generatedProposal();

    mockRegenerateSection.mockResolvedValueOnce({
      data: { section: "introduction", content: "Punchier intro.", clarificationFlags: [], supportingMaterialUsage: [] },
      provider: "anthropic" as const,
      model: "mock-model",
      latencyMs: 1,
      inputTokens: 1,
      outputTokens: 1,
    });
    const preview = await regenerateSectionPreview(
      supabase,
      proposalId,
      "introduction",
      "Make it punchier.",
      "anthropic",
      version.snapshot,
      user
    );

    const v2 = await saveManualRevision(
      supabase,
      proposalId,
      version.id,
      preview.snapshot,
      user,
      ["introduction"],
      preview.clarificationFlags,
      [preview.generationRunId]
    );

    expect(v2.version_number).toBe(2);
    expect(v2.change_type).toBe("section_regeneration");
    expect(v2.changed_sections).toEqual(["introduction"]);
    expect(v2.snapshot.content.introduction).toBe("Punchier intro.");

    const { data: run } = await admin.from("generation_runs").select().eq("id", preview.generationRunId).single();
    expect(run?.output_version_id).toBe(v2.id);
  });

  it("folds two regenerations into a single saved version, linking both runs to it", async () => {
    mockRegenerateSection.mockClear();
    const { proposalId, version } = await generatedProposal();

    mockRegenerateSection.mockResolvedValueOnce({
      data: { section: "introduction", content: "Regenerated intro.", clarificationFlags: [], supportingMaterialUsage: [] },
      provider: "anthropic" as const,
      model: "mock-model",
      latencyMs: 1,
      inputTokens: 1,
      outputTokens: 1,
    });
    const firstPreview = await regenerateSectionPreview(
      supabase,
      proposalId,
      "introduction",
      "Punch it up.",
      "anthropic",
      version.snapshot,
      user
    );

    // The second regeneration is based on the draft that already includes
    // the first regeneration's (still unsaved) result, exactly as the
    // workspace's client-side draft buffer would send it.
    mockRegenerateSection.mockResolvedValueOnce({
      data: { section: "deliverables", content: ["Regenerated deliverable"], clarificationFlags: [], supportingMaterialUsage: [] },
      provider: "anthropic" as const,
      model: "mock-model",
      latencyMs: 1,
      inputTokens: 1,
      outputTokens: 1,
    });
    const secondPreview = await regenerateSectionPreview(
      supabase,
      proposalId,
      "deliverables",
      "Trim to one item.",
      "anthropic",
      firstPreview.snapshot,
      user
    );

    const v2 = await saveManualRevision(
      supabase,
      proposalId,
      version.id,
      secondPreview.snapshot,
      user,
      ["introduction", "deliverables"],
      [...firstPreview.clarificationFlags, ...secondPreview.clarificationFlags],
      [firstPreview.generationRunId, secondPreview.generationRunId]
    );

    expect(v2.snapshot.content.introduction).toBe("Regenerated intro.");
    expect(v2.snapshot.content.deliverables).toEqual(["Regenerated deliverable"]);
    expect(v2.changed_sections.sort()).toEqual(["deliverables", "introduction"]);

    const { data: runs } = await admin
      .from("generation_runs")
      .select("id, output_version_id")
      .in("id", [firstPreview.generationRunId, secondPreview.generationRunId]);
    expect(runs!.every((r) => r.output_version_id === v2.id)).toBe(true);
  });

  it("still rejects the save with STALE_VERSION if the base version changed before saving", async () => {
    mockRegenerateSection.mockClear();
    const { proposalId, version } = await generatedProposal();

    mockRegenerateSection.mockResolvedValueOnce({
      data: { section: "introduction", content: "Stale regeneration output.", clarificationFlags: [], supportingMaterialUsage: [] },
      provider: "anthropic" as const,
      model: "mock-model",
      latencyMs: 1,
      inputTokens: 1,
      outputTokens: 1,
    });
    const preview = await regenerateSectionPreview(
      supabase,
      proposalId,
      "introduction",
      "Make it punchier.",
      "anthropic",
      version.snapshot,
      user
    );

    // Someone else saves a manual edit in the meantime, based on the same v1.
    const manualEditSnapshot = { ...version.snapshot, content: { ...version.snapshot.content, pricing: "$20,000" } };
    const v2 = await saveManualRevision(supabase, proposalId, version.id, manualEditSnapshot, user);

    // Saving the regeneration's preview against the now-stale v1 must fail.
    await expect(
      saveManualRevision(
        supabase,
        proposalId,
        version.id,
        preview.snapshot,
        user,
        ["introduction"],
        preview.clarificationFlags,
        [preview.generationRunId]
      )
    ).rejects.toMatchObject({ code: "STALE_VERSION" });

    const { data: current } = await admin.from("proposals").select("current_version_id").eq("id", proposalId).single();
    expect(current?.current_version_id).toBe(v2.id);
  });
});
