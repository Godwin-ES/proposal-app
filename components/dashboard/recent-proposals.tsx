"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
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
import { formatDateTime } from "@/lib/format";
import { deleteProposalAction } from "@/actions/proposals";
import type { ProposalRow } from "@/lib/repositories/proposals";

const DELETABLE_STATUSES = new Set(["draft", "needs_clarification"]);

function DeleteProposalButton({ proposal }: { proposal: ProposalRow }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProposalAction(proposal.id);
      if (result.ok) {
        toast.success("Proposal deleted.");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label="Delete proposal"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes {proposal.client_name || "this proposal"}
            {proposal.company_name ? ` (${proposal.company_name})` : ""}, including any uploaded supporting
            material. This cannot be undone.
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

export function RecentProposals({
  proposals,
  emptyTitle = "No proposals here",
  emptyDescription,
}: {
  proposals: ProposalRow[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = proposals.filter((p) => {
    const haystack = `${p.client_name} ${p.company_name}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  if (proposals.length === 0) {
    return <EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Search by client or company..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs"
      />
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/proposals/${p.id}`} className="font-medium hover:underline">
                    {p.client_name || "(unnamed client)"}
                  </Link>
                </TableCell>
                <TableCell>{p.company_name || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(p.updated_at)}</TableCell>
                <TableCell>{DELETABLE_STATUSES.has(p.status) ? <DeleteProposalButton proposal={p} /> : null}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
