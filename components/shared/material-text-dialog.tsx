"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

/**
 * Shows the extracted text of one supporting-material file — never the raw
 * file bytes — in a read-only dialog. Used by both the Salesperson's own
 * materials panel and the Approver's "Sources used" list; each wires its own
 * fetch (different authorization paths) and just passes the result here.
 */
export function MaterialTextDialog({
  open,
  onOpenChange,
  filename,
  text,
  loading,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string | null;
  text: string | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{filename ?? "Supporting material"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading extracted text...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</pre>
        )}
      </DialogContent>
    </Dialog>
  );
}
