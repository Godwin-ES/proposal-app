"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import type { ProposalSnapshot } from "@/lib/domain/types";

export function ProposalDetailsEditor({
  client,
  onSave,
}: {
  client: ProposalSnapshot["client"];
  onSave: (client: ProposalSnapshot["client"]) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(client);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const ok = await onSave(values);
    setSaving(false);
    if (ok) setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setValues(client);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" /> Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Client Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-clientName">Client Name</Label>
            <Input
              id="edit-clientName"
              value={values.clientName}
              onChange={(e) => setValues((v) => ({ ...v, clientName: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-companyName">Company Name</Label>
            <Input
              id="edit-companyName"
              value={values.companyName}
              onChange={(e) => setValues((v) => ({ ...v, companyName: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-dateOfCall">Date of Call</Label>
            <Input
              id="edit-dateOfCall"
              type="date"
              value={values.dateOfCall}
              onChange={(e) => setValues((v) => ({ ...v, dateOfCall: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-salespersonName">Salesperson Name</Label>
            <Input
              id="edit-salespersonName"
              value={values.salespersonName}
              onChange={(e) => setValues((v) => ({ ...v, salespersonName: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
