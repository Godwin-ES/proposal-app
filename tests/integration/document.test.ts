// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import type { CurrentUser } from "@/lib/auth/current-user";

const mockGenerate = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  getProvider: () => ({ generate: mockGenerate, regenerateSection: vi.fn() }),
  defaultModelFor: () => "mock-model",
}));

const { generateInitialDraft } = await import("@/lib/ai/service");
const { submitProposalForApproval, decideProposalApproval } = await import("@/lib/approvals/service");
const { ensureFinalPdf } = await import("@/lib/documents/service");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

const VALID_AI_RESULT = {
  data: {
    introduction: "AI intro for the final document test.",
    projectScope: "AI scope for the final document test.",
    recommendedApproach: "AI approach for the final document test.",
    deliverables: ["Document deliverable one", "Document deliverable two"],
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

describe.skipIf(!hasCredentials)("final PDF generation (hosted Supabase integration)", () => {
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
      email: "sales.demo@koyatalent.test",
      password: "DemoSales123!",
    });
    if (error) throw error;
    salesUser = { userId: data.user!.id, email: data.user!.email!, fullName: "Sam Rep", role: "salesperson" };

    const { error: approverError } = await approverClient.auth.signInWithPassword({
      email: "approver.demo@koyatalent.test",
      password: "DemoApprover123!",
    });
    if (approverError) throw approverError;
  });

  afterAll(async () => {
    for (const id of proposalIds) {
      const { data: versions } = await admin.from("proposal_versions").select("id").eq("proposal_id", id);
      for (const v of versions ?? []) {
        await admin.storage.from("proposal-final-documents").remove([`${salesUser.userId}/${id}/${v.id}/proposal.pdf`]);
      }
    }
    if (proposalIds.length > 0) await admin.from("proposals").delete().in("id", proposalIds);
  });

  async function approvedProposal() {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update(COMPLETE_INTAKE).eq("id", proposal.id);
    mockGenerate.mockResolvedValueOnce(VALID_AI_RESULT);
    const version = await generateInitialDraft(salesClient, proposal.id, "anthropic", salesUser);
    await submitProposalForApproval(salesClient, proposal.id, version.id, salesUser);
    await decideProposalApproval(approverClient, {
      proposalId: proposal.id,
      versionId: version.id,
      decision: "approved",
      comments: null,
    });
    return { proposalId: proposal.id, version };
  }

  it("generates a valid PDF containing the exact approved snapshot content", async () => {
    const { proposalId, version } = await approvedProposal();

    const doc = await ensureFinalPdf(salesClient, proposalId, version.id, salesUser);
    expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);

    const { data: updatedVersion } = await admin
      .from("proposal_versions")
      .select("pdf_status, pdf_storage_path, pdf_sha256")
      .eq("id", version.id)
      .single();
    expect(updatedVersion?.pdf_status).toBe("ready");
    expect(updatedVersion?.pdf_storage_path).toBe(doc.storagePath);

    const { data: fileBlob, error: downloadError } = await salesClient.storage
      .from("proposal-final-documents")
      .download(doc.storagePath);
    expect(downloadError).toBeNull();

    const buffer = Buffer.from(await fileBlob!.arrayBuffer());
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");

    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const extracted = await parser.getText();
    await parser.destroy();

    expect(extracted.text).toContain("Jane Doe");
    expect(extracted.text).toContain("Acme Co");
    expect(extracted.text).toContain("AI intro for the final document test.");
    expect(extracted.text).toContain("Document deliverable one");
    expect(extracted.text).toContain("6 weeks");
    expect(extracted.text).toContain("$12,000");
  });

  it("is idempotent: calling again returns the same stored PDF metadata", async () => {
    const { proposalId, version } = await approvedProposal();
    const first = await ensureFinalPdf(salesClient, proposalId, version.id, salesUser);
    const second = await ensureFinalPdf(salesClient, proposalId, version.id, salesUser);
    expect(second.sha256).toBe(first.sha256);
    expect(second.storagePath).toBe(first.storagePath);
  });

  it("rejects generation for a proposal that is not approved", async () => {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update(COMPLETE_INTAKE).eq("id", proposal.id);
    mockGenerate.mockResolvedValueOnce(VALID_AI_RESULT);
    const version = await generateInitialDraft(salesClient, proposal.id, "anthropic", salesUser);

    await expect(ensureFinalPdf(salesClient, proposal.id, version.id, salesUser)).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });
});
