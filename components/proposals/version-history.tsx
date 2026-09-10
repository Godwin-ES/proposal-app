"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildProposalText } from "@/lib/templates/proposal";
import { LocalDateTime } from "@/components/shared/local-datetime";
import type { ChangedSectionLabel, ProposalChangeType, ProposalSnapshot } from "@/lib/domain/types";
import { SECTION_DISPLAY_LABELS } from "@/lib/domain/section-labels";

export type VersionHistoryEntry = {
  id: string;
  versionNumber: number;
  createdAt: string;
  changeType: ProposalChangeType;
  changedSection: ChangedSectionLabel | null;
  snapshot: ProposalSnapshot;
  isCurrent: boolean;
  isApproved: boolean;
};

const CHANGE_TYPE_LABELS: Record<ProposalChangeType, string> = {
  initial_generation: "Initial generation",
  manual_edit: "Manual edit",
  section_regeneration: "Section regeneration",
};

export function VersionHistory({ versions }: { versions: VersionHistoryEntry[] }) {
  const [inspecting, setInspecting] = useState<VersionHistoryEntry | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">v{v.versionNumber}</TableCell>
                <TableCell className="text-muted-foreground">
                  <LocalDateTime value={v.createdAt} />
                </TableCell>
                <TableCell>{CHANGE_TYPE_LABELS[v.changeType]}</TableCell>
                <TableCell className="text-muted-foreground">
                  {v.changedSection ? SECTION_DISPLAY_LABELS[v.changedSection] : "—"}
                </TableCell>
                <TableCell className="flex flex-wrap gap-1">
                  {v.isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                  {v.isApproved ? <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Approved</Badge> : null}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setInspecting(v)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={inspecting !== null} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version {inspecting?.versionNumber}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm">{inspecting ? buildProposalText(inspecting.snapshot) : null}</pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
