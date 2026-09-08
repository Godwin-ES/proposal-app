import { Badge } from "@/components/ui/badge";
import type { ProposalStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  needs_clarification: "Needs Clarification",
  pending_approval: "Pending Approval",
  approved: "Approved",
  changes_requested: "Changes Requested",
  delivered: "Delivered",
};

const STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  needs_clarification: "bg-amber-100 text-amber-900 border-transparent dark:bg-amber-950 dark:text-amber-200",
  pending_approval: "bg-blue-100 text-blue-900 border-transparent dark:bg-blue-950 dark:text-blue-200",
  approved: "bg-emerald-100 text-emerald-900 border-transparent dark:bg-emerald-950 dark:text-emerald-200",
  changes_requested: "bg-orange-100 text-orange-900 border-transparent dark:bg-orange-950 dark:text-orange-200",
  delivered: "bg-violet-100 text-violet-900 border-transparent dark:bg-violet-950 dark:text-violet-200",
};

export function StatusBadge({ status, className }: { status: ProposalStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
