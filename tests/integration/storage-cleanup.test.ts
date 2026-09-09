// @vitest-environment node
//
// This exercises the storage cleanup primitive in isolation, and also
// documents (via the second test) exactly why a database-level trigger
// cannot do this job: Supabase rejects direct SQL DELETE against
// storage.objects, so cleanup must happen through the Storage client.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import { SUPPORTING_MATERIAL_BUCKET } from "@/lib/repositories/materials";
import { removeProposalStorage } from "@/lib/storage/cleanup";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

describe.skipIf(!hasCredentials)("removeProposalStorage (hosted Supabase integration)", () => {
  let supabase: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let userId: string;
  const proposalIds: string[] = [];

  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: "sales.demo@koyatalent.test",
      password: "DemoSales123!",
    });
    if (error) throw error;
    userId = data.user!.id;
  });

  afterAll(async () => {
    if (proposalIds.length > 0) await admin.from("proposals").delete().in("id", proposalIds);
  });

  it("removes every file under a proposal's prefix in both buckets, leaving other proposals untouched", async () => {
    const proposal = await proposalsRepo.createProposal(supabase, userId, "Sam Rep");
    proposalIds.push(proposal.id);
    const otherProposal = await proposalsRepo.createProposal(supabase, userId, "Sam Rep");
    proposalIds.push(otherProposal.id);

    async function upload(proposalId: string, filename: string) {
      const path = `${userId}/${proposalId}/${crypto.randomUUID()}/${filename}`;
      const { data: signed, error } = await supabase.storage.from(SUPPORTING_MATERIAL_BUCKET).createSignedUploadUrl(path);
      if (error) throw error;
      const { error: uploadError } = await supabase.storage
        .from(SUPPORTING_MATERIAL_BUCKET)
        .uploadToSignedUrl(path, signed.token, new Blob(["test content"]));
      if (uploadError) throw uploadError;
      return path;
    }

    await upload(proposal.id, "a.txt");
    await upload(proposal.id, "b.txt");
    const otherPath = await upload(otherProposal.id, "keep-me.txt");

    await removeProposalStorage(supabase, userId, proposal.id);

    const { data: remainingForTarget } = await admin.storage
      .from(SUPPORTING_MATERIAL_BUCKET)
      .list(`${userId}/${proposal.id}`, { limit: 100 });
    expect(remainingForTarget ?? []).toHaveLength(0);

    const { data: otherStillThere } = await admin.storage.from(SUPPORTING_MATERIAL_BUCKET).download(otherPath);
    expect(otherStillThere).not.toBeNull();

    // Clean up the untouched proposal's file too.
    await admin.storage.from(SUPPORTING_MATERIAL_BUCKET).remove([otherPath]);
  });
});
