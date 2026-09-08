"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";

export function ProposalEditorDialog({
  trigger,
  title,
  description,
  initialValue,
  multiline = true,
  onSave,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  initialValue: string;
  multiline?: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const ok = await onSave(value);
    setSaving(false);
    if (ok) setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setValue(initialValue);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {multiline ? (
          <Textarea rows={8} value={value} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <input
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || value.trim() === initialValue.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
