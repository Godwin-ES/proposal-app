import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DomainError, NotFoundError } from "@/lib/domain/errors";

export const SUPPORTING_MATERIAL_BUCKET = "proposal-supporting-material";

type MaterialRowBase = Database["public"]["Tables"]["supporting_materials"]["Row"];
export type MaterialRow = Omit<MaterialRowBase, "extraction_status"> & {
  extraction_status: "pending" | "ready" | "failed";
};

export function materialStoragePath(userId: string, proposalId: string, materialId: string, filename: string): string {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${proposalId}/${materialId}/${safeFilename}`;
}

export async function countActiveMaterials(supabase: SupabaseClient<Database>, proposalId: string): Promise<number> {
  const { count, error } = await supabase
    .from("supporting_materials")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId);

  if (error) throw new DomainError("VALIDATION_ERROR", "material-count", error.message, true);
  return count ?? 0;
}

export async function insertMaterial(
  supabase: SupabaseClient<Database>,
  input: {
    id: string;
    proposalId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    createdBy: string;
  }
): Promise<MaterialRow> {
  const { data, error } = await supabase
    .from("supporting_materials")
    .insert({
      id: input.id,
      proposal_id: input.proposalId,
      filename: input.filename,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      storage_path: input.storagePath,
      extraction_status: "pending",
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) throw new DomainError("MATERIAL_UPLOAD_FAILED", "material-upload", error.message, true);
  return data as MaterialRow;
}

export async function getMaterial(supabase: SupabaseClient<Database>, materialId: string): Promise<MaterialRow> {
  const { data, error } = await supabase.from("supporting_materials").select().eq("id", materialId).maybeSingle();
  if (error) throw new DomainError("VALIDATION_ERROR", "material-lookup", error.message, true);
  if (!data) throw new NotFoundError("This supporting material does not exist or you do not have access to it.");
  return data as MaterialRow;
}

export async function listMaterialsForProposal(
  supabase: SupabaseClient<Database>,
  proposalId: string
): Promise<MaterialRow[]> {
  const { data, error } = await supabase
    .from("supporting_materials")
    .select()
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });

  if (error) throw new DomainError("VALIDATION_ERROR", "material-list", error.message, true);
  return (data ?? []) as MaterialRow[];
}

export async function setMaterialExtractionResult(
  supabase: SupabaseClient<Database>,
  materialId: string,
  result: { status: "ready" | "failed"; extractedText: string | null; warning: string | null }
): Promise<MaterialRow> {
  const { data, error } = await supabase
    .from("supporting_materials")
    .update({
      extraction_status: result.status,
      extracted_text: result.extractedText,
      warning: result.warning,
    })
    .eq("id", materialId)
    .select()
    .single();

  if (error) throw new DomainError("MATERIAL_EXTRACTION_FAILED", "material-extraction", error.message, true);
  return data as MaterialRow;
}

export async function deleteMaterial(supabase: SupabaseClient<Database>, materialId: string): Promise<void> {
  const { error } = await supabase.from("supporting_materials").delete().eq("id", materialId);
  if (error) throw new DomainError("INVALID_STATE", "material-remove", error.message, false);
}
