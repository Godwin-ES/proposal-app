// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import { deleteDraftProposal } from "@/lib/proposals/service";
import { SUPPORTING_MATERIAL_BUCKET } from "@/lib/repositories/materials";
import type { CurrentUser } from "@/lib/auth/current-user";
import { salesTestAccount, approverTestAccount, hasTestAccountCredentials } from "@/tests/helpers/test-accounts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY) && hasTestAccountCredentials();

describe.skipIf(!hasCredentials)("delete draft proposal (hosted Supabase integration)", () => {
  let salesClient: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let salesUser: CurrentUser;
  const proposalIds: string[] = [];

  beforeAll(async () => {
    salesClient = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data, error } = await salesClient.auth.signInWithPassword({
      ...salesTestAccount(),
    });
    if (error) throw error;
    salesUser = { userId: data.user!.id, email: data.user!.email!, fullName: "Sam Rep", role: "salesperson" };
  });

  afterAll(async () => {
    if (proposalIds.length > 0) await admin.from("proposals").delete().in("id", proposalIds);
  });

  it("deletes a draft proposal", async () => {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);

    await deleteDraftProposal(salesClient, salesUser, proposal.id);

    const { data } = await admin.from("proposals").select("id").eq("id", proposal.id).maybeSingle();
    expect(data).toBeNull();
  });

  it("deletes a needs_clarification proposal and removes its uploaded supporting material", async () => {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update({ status: "needs_clarification" }).eq("id", proposal.id);

    const path = `${salesUser.userId}/${proposal.id}/${crypto.randomUUID()}/notes.txt`;
    const { data: signed, error: signError } = await salesClient.storage
      .from(SUPPORTING_MATERIAL_BUCKET)
      .createSignedUploadUrl(path);
    if (signError) throw signError;
    const { error: uploadError } = await salesClient.storage
      .from(SUPPORTING_MATERIAL_BUCKET)
      .uploadToSignedUrl(path, signed.token, new Blob(["test content"]));
    if (uploadError) throw uploadError;

    await deleteDraftProposal(salesClient, salesUser, proposal.id);

    const { data: proposalRow } = await admin.from("proposals").select("id").eq("id", proposal.id).maybeSingle();
    expect(proposalRow).toBeNull();

    const { data: remainingFiles } = await admin.storage
      .from(SUPPORTING_MATERIAL_BUCKET)
      .list(`${salesUser.userId}/${proposal.id}`, { limit: 100 });
    expect(remainingFiles ?? []).toHaveLength(0);
  });

  it("refuses to delete a proposal that has already been through approval (changes_requested)", async () => {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    await admin.from("proposals").update({ status: "changes_requested" }).eq("id", proposal.id);

    await expect(deleteDraftProposal(salesClient, salesUser, proposal.id)).rejects.toMatchObject({
      code: "INVALID_STATE",
    });

    const { data } = await admin.from("proposals").select("id").eq("id", proposal.id).maybeSingle();
    expect(data).not.toBeNull();
  });

  it("refuses to delete a proposal owned by someone else", async () => {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);
    const impostor: CurrentUser = { ...salesUser, userId: crypto.randomUUID() };

    await expect(deleteDraftProposal(salesClient, impostor, proposal.id)).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });

    const { data } = await admin.from("proposals").select("id").eq("id", proposal.id).maybeSingle();
    expect(data).not.toBeNull();
  });

  // Regression test for a real vulnerability found in review: migration 004
  // never revoked the default PUBLIC execute grant Postgres gives new
  // functions, so an anonymous request could call delete_draft_proposal
  // directly — and because auth.uid() is NULL for an anonymous caller, the
  // function's `created_by <> auth.uid()` ownership check evaluates to NULL
  // (not TRUE) and silently fails to reject it. This calls the RPC directly
  // (not through the app's service layer) specifically to exercise the
  // database boundary itself, not the application-layer check.
  it("rejects an anonymous (unauthenticated) caller at the database boundary", async () => {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);

    const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await anonClient.rpc("delete_draft_proposal", { p_proposal_id: proposal.id });
    expect(error).not.toBeNull();
    expect(error?.message ?? "").not.toContain("does not exist");

    const { data } = await admin.from("proposals").select("id").eq("id", proposal.id).maybeSingle();
    expect(data).not.toBeNull();
  });

  it("rejects a different authenticated user at the database boundary (not just the app-layer ownership check)", async () => {
    const proposal = await proposalsRepo.createProposal(salesClient, salesUser.userId, salesUser.fullName);
    proposalIds.push(proposal.id);

    const otherClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await otherClient.auth.signInWithPassword({
      ...approverTestAccount(),
    });
    if (signInError) throw signInError;

    const { error } = await otherClient.rpc("delete_draft_proposal", { p_proposal_id: proposal.id });
    expect(error?.message ?? "").toContain("PERMISSION_DENIED");

    const { data } = await admin.from("proposals").select("id").eq("id", proposal.id).maybeSingle();
    expect(data).not.toBeNull();
  });
});
