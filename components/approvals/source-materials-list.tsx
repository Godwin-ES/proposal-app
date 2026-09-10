"use client";

import { useState } from "react";
import { getReviewMaterialTextAction } from "@/actions/approvals";
import { MaterialTextDialog } from "@/components/shared/material-text-dialog";
import { Button } from "@/components/ui/button";

/**
 * The Approver's "Sources used" list — click a filename to see the exact
 * extracted text the AI read from it (never the raw file). Only materials
 * the review context already determined were actually cited grounding some
 * section are listed here at all (see lib/domain/material-attribution.ts),
 * and get_review_material_text re-checks that same citation server-side.
 */
export function SourceMaterialsList({
  proposalId,
  sources,
}: {
  proposalId: string;
  sources: { id: string; filename: string }[];
}) {
  const [viewing, setViewing] = useState<{
    filename: string | null;
    text: string | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  async function handleView(source: { id: string; filename: string }) {
    setViewing({ filename: source.filename, text: null, loading: true, error: null });
    const result = await getReviewMaterialTextAction(proposalId, source.id);
    if (result.ok) {
      setViewing({ filename: result.data.filename, text: result.data.extractedText, loading: false, error: null });
    } else {
      setViewing({ filename: source.filename, text: null, loading: false, error: result.error.message });
    }
  }

  if (sources.length === 0) {
    return <p className="mt-1 text-muted-foreground">No supporting material was used.</p>;
  }

  return (
    <>
      <ul className="mt-1 flex flex-col gap-1">
        {sources.map((source) => (
          <li key={source.id}>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-muted-foreground"
              onClick={() => handleView(source)}
            >
              {source.filename}
            </Button>
          </li>
        ))}
      </ul>
      <MaterialTextDialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
        filename={viewing?.filename ?? null}
        text={viewing?.text ?? null}
        loading={viewing?.loading ?? false}
        error={viewing?.error ?? null}
      />
    </>
  );
}
