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
  changedSections: ChangedSectionLabel[];
  snapshot: ProposalSnapshot;
  isCurrent: boolean;
  isApproved: boolean;
};

const CHANGE_TYPE_LABELS: Record<ProposalChangeType, string> = {
  initial_generation: "Initial generation",
  manual_edit: "Manual edit",
  section_regeneration: "Section regeneration",
};

export function VersionHistory({
  versions,
  editable = false,
  onRevert,
}: {
  versions: VersionHistoryEntry[];
  /** Whether "Revert to this version" should be offered (only while the proposal is editable). */
  editable?: boolean;
  /** Loads a past version's content into the local editor draft — see ProposalWorkspace. */
  onRevert?: (version: VersionHistoryEntry) => void;
}) {
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
              <TableHead>Sections</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                  {v.changedSections.length > 0
                    ? v.changedSections.map((s) => SECTION_DISPLAY_LABELS[s]).join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="flex flex-wrap gap-1">
                  {v.isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                  {v.isApproved ? <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Approved</Badge> : null}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setInspecting(v)}>
                      View
                    </Button>
                    {editable && !v.isCurrent && onRevert ? (
                      <Button variant="ghost" size="sm" onClick={() => onRevert(v)}>
                        Revert
                      </Button>
                    ) : null}
                  </div>
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
          {editable && inspecting && !inspecting.isCurrent && onRevert ? (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onRevert(inspecting);
                  setInspecting(null);
                }}
              >
                Revert to this version
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
