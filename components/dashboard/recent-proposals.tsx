"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";
import type { ProposalRow } from "@/lib/repositories/proposals";

export function RecentProposals({ proposals }: { proposals: ProposalRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = proposals.filter((p) => {
    const haystack = `${p.client_name} ${p.company_name}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  if (proposals.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No proposals yet"
        description="Create your first proposal to get started."
      />
    );
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
                  {new Date(p.updated_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
