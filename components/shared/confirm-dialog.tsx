"use client";

import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

/**
 * A confirm dialog that stays open and visibly pending for the whole
 * operation, instead of Radix's AlertDialogAction (which always closes the
 * dialog the instant it's clicked, regardless of whether the async action
 * it triggers has finished). Closes itself on success; stays open with
 * whatever error feedback the caller already shows (e.g. a toast) so the
 * user can see what happened and retry without reopening.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  confirmVariant = "default",
  onConfirm,
  stopClickPropagation = false,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"];
  /** Perform the action. Return `true` to close the dialog (success), `false` to
   * leave it open (e.g. after a failure the caller has already toasted). */
  onConfirm: () => Promise<boolean>;
  /** Stops clicks inside the dialog content from bubbling — needed when the
   * trigger lives inside a clickable row (React portals still bubble
   * synthetic events through the component tree, not the DOM tree). */
  stopClickPropagation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    const ok = await onConfirm();
    setPending(false);
    if (ok) setOpen(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        closeDisabled={pending}
        onClick={stopClickPropagation ? (e) => e.stopPropagation() : undefined}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant={confirmVariant} disabled={pending} onClick={handleConfirm}>
            {pending ? (pendingLabel ?? "Working...") : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
