"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteProposalAction } from "@/actions/proposals";
// DELETABLE_STATUSES lives in lib/domain/types.ts, not here — this file is
// "use client", and a Server Component importing a non-component export
// across a "use client" boundary gets an opaque client reference in
// production builds, not the real value (dev mode tolerates it, which is
// why that only broke in production). Import it from lib/domain/types
// directly wherever it's needed, not through this component.

export function DeleteProposalButton({
  proposalId,
  clientLabel,
  variant = "compact",
  redirectTo,
}: {
  proposalId: string;
  /** Shown in the confirmation dialog, e.g. "Jane Doe (Acme Co)". */
  clientLabel: string;
  /** "compact": icon-only, for a table row. "full": labeled button, for the workspace itself. */
  variant?: "compact" | "full";
  /** Where to navigate after a successful delete. Omit to just refresh in place (e.g. a list the row disappears from). */
  redirectTo?: string;
}) {
  const router = useRouter();

  async function handleDelete(): Promise<boolean> {
    const result = await deleteProposalAction(proposalId);
    if (result.ok) {
      toast.success("Proposal deleted.");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
      return true;
    }
    toast.error(result.error.message);
    return false;
  }

  const trigger =
    variant === "compact" ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Delete proposal"
        onClick={(e) => e.stopPropagation()}
      >
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
    ) : (
      <Button type="button" variant="outline">
        <Trash2 className="size-4" />
        Delete Proposal
      </Button>
    );

  return (
    <ConfirmDialog
      trigger={trigger}
      title="Delete this proposal?"
      description={
        <>
          This permanently deletes {clientLabel}, including any uploaded supporting material. This cannot be undone.
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      onConfirm={handleDelete}
      stopClickPropagation
    />
  );
}
