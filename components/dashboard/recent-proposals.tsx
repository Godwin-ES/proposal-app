"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { DeleteProposalButton } from "@/components/proposals/delete-proposal-button";
import { DELETABLE_STATUSES } from "@/lib/domain/types";
import type { ProposalRow } from "@/lib/repositories/proposals";

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
                <TableCell className="text-muted-foreground">
                  <LocalDateTime value={p.updated_at} />
                </TableCell>
                <TableCell>
                  {DELETABLE_STATUSES.includes(p.status) ? (
                    <DeleteProposalButton
                      proposalId={p.id}
                      clientLabel={`${p.client_name || "this proposal"}${p.company_name ? ` (${p.company_name})` : ""}`}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
