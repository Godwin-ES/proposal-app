import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalDateTime } from "@/components/shared/local-datetime";

export type ApprovalQueueRow = {
  proposalId: string;
  clientName: string;
  companyName: string;
  salespersonName: string;
  versionNumber: number;
  submittedAt: string | null;
};

export function ApprovalQueue({
  rows,
  emptyTitle = "Nothing waiting for review",
  emptyDescription = "Proposals submitted by a salesperson will appear here.",
}: {
  rows: ApprovalQueueRow[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={ClipboardCheck} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.proposalId}>
              <TableCell>
                <Link href={`/approvals/${row.proposalId}`} className="font-medium hover:underline">
                  {row.companyName || "—"}
                </Link>
              </TableCell>
              <TableCell>{row.clientName || "—"}</TableCell>
              <TableCell>{row.salespersonName || "—"}</TableCell>
              <TableCell>v{row.versionNumber}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.submittedAt ? <LocalDateTime value={row.submittedAt} /> : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
