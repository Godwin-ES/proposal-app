import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { History } from "lucide-react";
import type { DeliveryStatus } from "@/lib/domain/types";
import { LocalDateTime } from "@/components/shared/local-datetime";

export type DeliveryHistoryEntry = {
  id: string;
  status: DeliveryStatus;
  recipient: string;
  createdAt: string;
  error: string | null;
};

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  sent: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  uncertain: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

export function DeliveryHistory({ attempts }: { attempts: DeliveryHistoryEntry[] }) {
  if (attempts.length === 0) {
    return <EmptyState icon={History} title="No delivery attempts yet" />;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Badge variant="outline" className={STATUS_STYLES[a.status]}>
                  {a.status}
                </Badge>
              </TableCell>
              <TableCell>{a.recipient}</TableCell>
              <TableCell className="text-muted-foreground">
                <LocalDateTime value={a.createdAt} />
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">{a.error ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
