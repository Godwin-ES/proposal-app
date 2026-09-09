// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import { deleteDraftProposal } from "@/lib/proposals/service";
import { SUPPORTING_MATERIAL_BUCKET } from "@/lib/repositories/materials";
import type { CurrentUser } from "@/lib/auth/current-user";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

describe.skipIf(!hasCredentials)("delete draft proposal (hosted Supabase integration)", () => {
  let salesClient: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let salesUser: CurrentUser;
  const proposalIds: string[] = [];

  beforeAll(async () => {
    salesClient = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data, error } = await salesClient.auth.signInWithPassword({
      email: "sales.demo@koyatalent.test",
      password: "DemoSales123!",
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
});
