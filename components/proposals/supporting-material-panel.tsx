"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileWarning, FileCheck2, FileClock, Loader2, Trash2, RotateCw, Upload } from "lucide-react";
import {
  prepareMaterialUploadAction,
  finalizeMaterialUploadAction,
  retryMaterialExtractionAction,
  removeMaterialAction,
} from "@/actions/materials";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MaterialSummary = {
  id: string;
  filename: string;
  sizeBytes: number;
  extractionStatus: "pending" | "ready" | "failed";
  warning: string | null;
};

const BUCKET = "proposal-supporting-material";

export function SupportingMaterialPanel({
  proposalId,
  initialMaterials,
  editable,
}: {
  proposalId: string;
  initialMaterials: MaterialSummary[];
  editable: boolean;
}) {
  const router = useRouter();
  const [materials, setMaterials] = useState(initialMaterials);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [busyMaterialId, setBusyMaterialId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File) {
    setUploading(true);
    try {
      const prep = await prepareMaterialUploadAction({
        proposalId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      if (!prep.ok) {
        toast.error(prep.error.message);
        return;
      }

      const { materialId, storagePath, token } = prep.data;
      setMaterials((prev) => [
        ...prev,
        { id: materialId, filename: file.name, sizeBytes: file.size, extractionStatus: "pending", warning: null },
      ]);

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(storagePath, token, file);

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        await removeMaterialAction(proposalId, materialId);
        setMaterials((prev) => prev.filter((m) => m.id !== materialId));
        return;
      }

      const finalizeResult = await finalizeMaterialUploadAction(proposalId, materialId);
      if (!finalizeResult.ok) {
        toast.error(finalizeResult.error.message);
      } else {
        const { extractionStatus, warning } = finalizeResult.data;
        setMaterials((prev) => prev.map((m) => (m.id === materialId ? { ...m, extractionStatus, warning } : m)));
        toast.success(extractionStatus === "ready" ? `${file.name} uploaded.` : `${file.name} uploaded, but ${warning}`);
        // Keeps server-computed state elsewhere on the page (generation
        // readiness blockers, the "N supporting files" count shown next to
        // Regenerate) in sync with a material that just became usable.
        router.refresh();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRetry(materialId: string) {
    setBusyMaterialId(materialId);
    startTransition(async () => {
      const result = await retryMaterialExtractionAction(proposalId, materialId);
      setBusyMaterialId(null);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const { extractionStatus, warning } = result.data;
      setMaterials((prev) => prev.map((m) => (m.id === materialId ? { ...m, extractionStatus, warning } : m)));
      if (extractionStatus === "ready") toast.success("Extraction succeeded.");
      router.refresh();
    });
  }

  function handleRemove(materialId: string) {
    setBusyMaterialId(materialId);
    startTransition(async () => {
      const result = await removeMaterialAction(proposalId, materialId);
      setBusyMaterialId(null);
      if (result.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== materialId));
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Supporting Material</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supporting material uploaded yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {materials.map((material) => (
              <li
                key={material.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <StatusIcon status={material.extractionStatus} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{material.filename}</p>
                    {material.warning ? (
                      <p className="truncate text-xs text-destructive">{material.warning}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{(material.sizeBytes / 1024).toFixed(0)} KB</p>
                    )}
                  </div>
                </div>
                {editable ? (
                  <div className="flex shrink-0 items-center gap-1">
                    {material.extractionStatus === "failed" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Retry extracting ${material.filename}`}
                        disabled={isPending}
                        onClick={() => handleRetry(material.id)}
                      >
                        {isPending && busyMaterialId === material.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RotateCw className="size-4" />
                        )}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${material.filename}`}
                      disabled={isPending}
                      onClick={() => handleRemove(material.id)}
                    >
                      {isPending && busyMaterialId === material.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {editable ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.md,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploading || materials.length >= 3}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              PDF, DOCX, Markdown, or plain text. Max 10 MB, up to 3 files.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: MaterialSummary["extractionStatus"] }) {
  if (status === "ready") return <FileCheck2 className="size-4 shrink-0 text-emerald-600" aria-label="Ready" />;
  if (status === "failed") return <FileWarning className="size-4 shrink-0 text-destructive" aria-label="Failed" />;
  return <FileClock className="size-4 shrink-0 text-muted-foreground" aria-label="Processing" />;
}
