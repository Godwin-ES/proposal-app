// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { EmailProvider } from "@/lib/delivery/provider";
import { salesTestAccount, approverTestAccount, hasTestAccountCredentials } from "@/tests/helpers/test-accounts";

const mockGenerate = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  getProvider: () => ({ generate: mockGenerate, regenerateSection: vi.fn() }),
}));

const mockFinalize = vi.fn();
vi.mock("@/lib/repositories/deliveries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/repositories/deliveries")>();
  mockFinalize.mockImplementation(actual.finalizeDeliveryAttempt);
  return { ...actual, finalizeDeliveryAttempt: mockFinalize };
});

const { generateInitialDraft } = await import("@/lib/ai/service");
const { submitProposalForApproval, decideProposalApproval } = await import("@/lib/approvals/service");
const { ensureFinalPdf } = await import("@/lib/documents/service");
const { sendProposal } = await import("@/lib/delivery/service");
const { updateClientEmail } = await import("@/lib/proposals/service");

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

function succeedingProvider(messageId = "provider-msg-1"): EmailProvider {
  return { sendProposal: vi.fn().mockResolvedValue({ providerMessageId: messageId }) };
}
function failingProvider(message = "provider down"): EmailProvider {
  return { sendProposal: vi.fn().mockRejectedValue(new Error(message)) };
}

describe.skipIf(!hasCredentials)("delivery pipeline (hosted Supabase integration)", () => {
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
    for (const id of proposalIds) {
      const { data: versions } = await admin.from("proposal_versions").select("id").eq("proposal_id", id);
      for (const v of versions ?? []) {
        await admin.storage.from("proposal-final-documents").remove([`${salesUser.userId}/${id}/${v.id}/proposal.pdf`]);
      }
    }
    if (proposalIds.length > 0) await admin.from("proposals").delete().in("id", proposalIds);
  });

  async function approvedProposalWithEmail(email = "client@example.test") {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update(COMPLETE_INTAKE).eq("id", proposal.id);
    await updateClientEmail(salesClient, proposal.id, email);
    mockGenerate.mockResolvedValueOnce(VALID_AI_RESULT);
    const version = await generateInitialDraft(salesClient, proposal.id, "claude-sonnet-5", salesUser);
    await submitProposalForApproval(salesClient, proposal.id, version.id, salesUser);
    await decideProposalApproval(approverClient, {
      proposalId: proposal.id,
      versionId: version.id,
      decision: "approved",
      comments: null,
    });
    return { proposalId: proposal.id, version };
  }

  it("blocks sending before the PDF is generated", async () => {
    const { proposalId, version } = await approvedProposalWithEmail();
    const provider = succeedingProvider();

    await expect(sendProposal(salesClient, proposalId, version.id, salesUser, provider)).rejects.toMatchObject({
      code: "DELIVERY_PREPARATION_FAILED",
    });
    expect(provider.sendProposal).not.toHaveBeenCalled();
  });

  it("creates a pending attempt before calling the provider, then marks it sent", async () => {
    const { proposalId, version } = await approvedProposalWithEmail();
    await ensureFinalPdf(salesClient, proposalId, version.id, salesUser);
    const provider = succeedingProvider("msg-success-1");

    const attempt = await sendProposal(salesClient, proposalId, version.id, salesUser, provider);
    expect(attempt.status).toBe("sent");
    expect(attempt.provider_message_id).toBe("msg-success-1");
    expect(provider.sendProposal).toHaveBeenCalledTimes(1);

    const { data: proposal } = await admin.from("proposals").select("status").eq("id", proposalId).single();
    expect(proposal?.status).toBe("delivered");

    const { data: attempts } = await admin.from("delivery_attempts").select().eq("proposal_id", proposalId);
    expect(attempts).toHaveLength(1);
    expect(attempts![0].status).toBe("sent");
  });

  it("records a failed attempt on a known provider failure and leaves the proposal approved", async () => {
    const { proposalId, version } = await approvedProposalWithEmail();
    await ensureFinalPdf(salesClient, proposalId, version.id, salesUser);
    const provider = failingProvider("SMTP rejected recipient");

    await expect(sendProposal(salesClient, proposalId, version.id, salesUser, provider)).rejects.toMatchObject({
      code: "DELIVERY_FAILED",
    });

    const { data: proposal } = await admin.from("proposals").select("status").eq("id", proposalId).single();
    expect(proposal?.status).toBe("approved");

    const { data: attempts } = await admin.from("delivery_attempts").select().eq("proposal_id", proposalId);
    expect(attempts).toHaveLength(1);
    expect(attempts![0].status).toBe("failed");
  });

  it("does not send twice for a rapid duplicate click (second prepare is rejected once the first has an attempt)", async () => {
    const { proposalId, version } = await approvedProposalWithEmail();
    await ensureFinalPdf(salesClient, proposalId, version.id, salesUser);
    const provider = succeedingProvider("msg-dup-1");

    await sendProposal(salesClient, proposalId, version.id, salesUser, provider);

    // Proposal is now delivered; a second send attempt must be rejected
    // (delivered is terminal, and prepare_delivery_attempt requires 'approved').
    await expect(sendProposal(salesClient, proposalId, version.id, salesUser, succeedingProvider())).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("surfaces an uncertain outcome when finalization cannot be confirmed, and blocks a second send", async () => {
    const { proposalId, version } = await approvedProposalWithEmail();
    await ensureFinalPdf(salesClient, proposalId, version.id, salesUser);

    // Provider succeeds, but the finalize call itself fails (simulated network
    // blip after the email was already sent) — the attempt stays `pending` in
    // the DB, which is exactly the ambiguous case the safe-send sequence must
    // not treat as silent success.
    mockFinalize.mockRejectedValueOnce(new Error("simulated network failure during finalize"));
    const provider = succeedingProvider("msg-uncertain-1");

    await expect(sendProposal(salesClient, proposalId, version.id, salesUser, provider)).rejects.toMatchObject({
      code: "DELIVERY_OUTCOME_UNCERTAIN",
    });

    const { data: attempts } = await admin.from("delivery_attempts").select().eq("proposal_id", proposalId);
    expect(attempts).toHaveLength(1);
    expect(attempts![0].status).toBe("uncertain");
    expect(attempts![0].provider_message_id).toBe("msg-uncertain-1");

    // Proposal remains approved (not silently marked delivered) while uncertain.
    const { data: proposal } = await admin.from("proposals").select("status").eq("id", proposalId).single();
    expect(proposal?.status).toBe("approved");

    // A further send attempt must be blocked until the uncertain attempt is resolved.
    await expect(
      sendProposal(salesClient, proposalId, version.id, salesUser, succeedingProvider())
    ).rejects.toMatchObject({ code: "DELIVERY_OUTCOME_UNCERTAIN" });
  });
});
