"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProposalAction(proposalId);
      if (result.ok) {
        toast.success("Proposal deleted.");
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error.message);
      }
    });
  }

  const trigger =
    variant === "compact" ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label="Delete proposal"
        onClick={(e) => e.stopPropagation()}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Trash2 className="size-4 text-muted-foreground" />
        )}
      </Button>
    ) : (
      <Button type="button" variant="outline" disabled={pending}>
        <Trash2 className="size-4" />
        {pending ? "Deleting..." : "Delete Proposal"}
      </Button>
    );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes {clientLabel}, including any uploaded supporting material. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
