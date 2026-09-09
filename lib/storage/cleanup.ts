import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { SUPPORTING_MATERIAL_BUCKET } from "@/lib/repositories/materials";
import { FINAL_DOCUMENTS_BUCKET } from "@/lib/documents/service";

/**
 * Supabase Storage objects have no foreign-key relationship to any table —
 * they're just files at a path this app happens to construct consistently
 * (`{user_id}/{proposal_id}/...`). Postgres FK `ON DELETE CASCADE` on
 * proposal_versions/supporting_materials/etc. cannot reach them, and a
 * database trigger can't either: Supabase rejects direct `DELETE FROM
 * storage.objects` at the SQL level ("Direct deletion from storage tables
 * is not allowed. Use the Storage API instead."), so the only place this
 * cleanup can correctly happen is application code via the Storage client.
 *
 * Call this BEFORE deleting the proposal row, not after — a proposal row
 * with no files is recoverable; files with no proposal row are invisible,
 * unreachable orphans that silently consume storage forever.
 */
async function listAllFiles(
  supabase: SupabaseClient<Database>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const { data: entries, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !entries) return [];

  const files: string[] = [];
  for (const entry of entries) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) {
      // No id means this entry is itself a folder — recurse into it.
      files.push(...(await listAllFiles(supabase, bucket, path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

export async function removeProposalStorage(
  supabase: SupabaseClient<Database>,
  userId: string,
  proposalId: string
): Promise<void> {
  for (const bucket of [SUPPORTING_MATERIAL_BUCKET, FINAL_DOCUMENTS_BUCKET]) {
    const files = await listAllFiles(supabase, bucket, `${userId}/${proposalId}`);
    if (files.length > 0) {
      await supabase.storage.from(bucket).remove(files);
    }
  }
}
