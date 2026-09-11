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
  clientEmail,
  onSave,
  onSaveEmail,
}: {
  client: ProposalSnapshot["client"];
  clientEmail: string;
  onSave: (client: ProposalSnapshot["client"]) => Promise<boolean>;
  onSaveEmail: (email: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(client);
  const [email, setEmail] = useState(clientEmail);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    // Client Email is saved through a separate action from the rest of these
    // fields (it isn't part of the versioned snapshot, so correcting it must
    // never create a new proposal version) — only call each save path when
    // its own fields actually changed.
    const detailsChanged = JSON.stringify(values) !== JSON.stringify(client);
    const emailChanged = email.trim() !== clientEmail.trim();
    const [detailsOk, emailOk] = await Promise.all([
      detailsChanged ? onSave(values) : Promise.resolve(true),
      emailChanged ? onSaveEmail(email) : Promise.resolve(true),
    ]);
    setSaving(false);
    if (detailsOk && emailOk) setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (next) {
          setValues(client);
          setEmail(clientEmail);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" /> Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent closeDisabled={saving}>
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
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-companyName">Company Name</Label>
            <Input
              id="edit-companyName"
              value={values.companyName}
              onChange={(e) => setValues((v) => ({ ...v, companyName: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-dateOfCall">Date of Call</Label>
            <Input
              id="edit-dateOfCall"
              type="date"
              value={values.dateOfCall}
              onChange={(e) => setValues((v) => ({ ...v, dateOfCall: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-salespersonName">Salesperson Name</Label>
            <Input
              id="edit-salespersonName"
              value={values.salespersonName}
              onChange={(e) => setValues((v) => ({ ...v, salespersonName: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="edit-clientEmail">Client Email (delivery address)</Label>
            <Input
              id="edit-clientEmail"
              type="email"
              value={email}
              placeholder="client@company.com"
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Saved separately — never creates a new proposal version.</p>
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
