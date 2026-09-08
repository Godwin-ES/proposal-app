// @vitest-environment node
//
// Integration tests hit hosted Supabase Storage with real binary uploads.
// jsdom's fetch/Blob implementation corrupts streamed upload bodies and
// surfaces as ECONNRESET; Node's native fetch (undici) handles them correctly.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import * as materialsRepo from "@/lib/repositories/materials";
import * as materialsService from "@/lib/materials/service";
import type { CurrentUser } from "@/lib/auth/current-user";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

describe.skipIf(!hasCredentials)("supporting material pipeline (hosted Supabase integration)", () => {
  let supabase: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let user: CurrentUser;
  const proposalIds: string[] = [];

  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: "sales.demo@koyatalent.test",
      password: "DemoSales123!",
    });
    if (error) throw error;

    user = { userId: data.user!.id, email: data.user!.email!, fullName: "Sam Rep", role: "salesperson" };
  });

  afterAll(async () => {
    if (proposalIds.length > 0) {
      await admin.from("proposals").delete().in("id", proposalIds);
    }
  });

  async function freshProposal() {
    const proposal = await proposalsRepo.createProposal(supabase, user.userId, user.fullName);
    proposalIds.push(proposal.id);
    return proposal;
  }

  it("uploads, extracts, and marks a .txt file ready", async () => {
    const proposal = await freshProposal();
    const content = "The operations team reconciles requests manually every Friday.";
    const file = new Blob([content], { type: "text/plain" });

    const prep = await materialsService.prepareMaterialUpload(
      supabase,
      { proposalId: proposal.id, filename: "notes.txt", mimeType: "text/plain", sizeBytes: content.length },
      user
    );

    const { error: uploadError } = await supabase.storage
      .from(materialsRepo.SUPPORTING_MATERIAL_BUCKET)
      .uploadToSignedUrl(prep.storagePath, prep.token, file);
    expect(uploadError).toBeNull();

    const finalized = await materialsService.finalizeMaterialUpload(supabase, prep.materialId, user);
    expect(finalized.extraction_status).toBe("ready");
    expect(finalized.extracted_text).toContain("reconciles requests manually every Friday");
  });

  it("marks extraction failed and blocks generation materials when the file cannot be parsed", async () => {
    const proposal = await freshProposal();
    // A .docx extension with content that is not a real docx/zip archive.
    const badContent = "not a real docx file";
    const file = new Blob([badContent], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

    const prep = await materialsService.prepareMaterialUpload(
      supabase,
      { proposalId: proposal.id, filename: "broken.docx", mimeType: file.type, sizeBytes: badContent.length },
      user
    );
    const { error: uploadError } = await supabase.storage
      .from(materialsRepo.SUPPORTING_MATERIAL_BUCKET)
      .uploadToSignedUrl(prep.storagePath, prep.token, file);
    expect(uploadError).toBeNull();

    const finalized = await materialsService.finalizeMaterialUpload(supabase, prep.materialId, user);

    expect(finalized.extraction_status).toBe("failed");
    expect(finalized.warning).toBeTruthy();

    const generationMaterials = await materialsService.getGenerationMaterials(supabase, proposal.id, user);
    expect(generationMaterials.ok).toBe(false);
  });

  it("rejects an unsupported file extension before creating a storage row", async () => {
    const proposal = await freshProposal();
    await expect(
      materialsService.prepareMaterialUpload(
        supabase,
        { proposalId: proposal.id, filename: "image.png", mimeType: "image/png", sizeBytes: 1000 },
        user
      )
    ).rejects.toMatchObject({ code: "MATERIAL_UPLOAD_FAILED" });
  });

  it("rejects a zero-byte upload", async () => {
    const proposal = await freshProposal();
    await expect(
      materialsService.prepareMaterialUpload(
        supabase,
        { proposalId: proposal.id, filename: "empty.txt", mimeType: "text/plain", sizeBytes: 0 },
        user
      )
    ).rejects.toMatchObject({ code: "MATERIAL_UPLOAD_FAILED" });
  });

  it("rejects a file larger than 10 MB", async () => {
    const proposal = await freshProposal();
    await expect(
      materialsService.prepareMaterialUpload(
        supabase,
        { proposalId: proposal.id, filename: "huge.txt", mimeType: "text/plain", sizeBytes: 11 * 1024 * 1024 },
        user
      )
    ).rejects.toMatchObject({ code: "MATERIAL_UPLOAD_FAILED" });
  });

  it("rejects a fourth material on the same proposal", async () => {
    const proposal = await freshProposal();
    for (let i = 0; i < 3; i++) {
      await materialsRepo.insertMaterial(supabase, {
        id: crypto.randomUUID(),
        proposalId: proposal.id,
        filename: `file-${i}.txt`,
        mimeType: "text/plain",
        sizeBytes: 10,
        storagePath: `${user.userId}/${proposal.id}/filler-${i}/file-${i}.txt`,
        createdBy: user.userId,
      });
    }

    await expect(
      materialsService.prepareMaterialUpload(
        supabase,
        { proposalId: proposal.id, filename: "fourth.txt", mimeType: "text/plain", sizeBytes: 10 },
        user
      )
    ).rejects.toMatchObject({ code: "MATERIAL_LIMIT_EXCEEDED" });
  });

  it("blocks add/remove once the proposal leaves an editable state", async () => {
    const proposal = await freshProposal();
    await admin.from("proposals").update({ status: "pending_approval" }).eq("id", proposal.id);

    await expect(
      materialsService.prepareMaterialUpload(
        supabase,
        { proposalId: proposal.id, filename: "late.txt", mimeType: "text/plain", sizeBytes: 10 },
        user
      )
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
