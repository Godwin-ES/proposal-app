import { StatusBadge } from "@/components/shared/status-badge";
import { LocalDateTime } from "@/components/shared/local-datetime";
import type { ProposalStatus } from "@/lib/domain/types";

export function ProposalHeader({
  clientName,
  companyName,
  status,
  versionNumber,
  ownerName,
  updatedAt,
  actions,
}: {
  clientName: string;
  companyName: string;
  status: ProposalStatus;
  versionNumber: number;
  ownerName: string;
  updatedAt: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{clientName || "New proposal"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{companyName || "—"}</p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <StatusBadge status={status} />
          <span>Version {versionNumber}</span>
          <span>Owner: {ownerName}</span>
          <span>
            Updated <LocalDateTime value={updatedAt} />
          </span>
        </div>
        {actions}
      </div>
    </div>
  );
}
