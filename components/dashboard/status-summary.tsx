import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProposalStatus } from "@/lib/domain/types";

const SUMMARY_GROUPS: { label: string; statuses: ProposalStatus[] }[] = [
  { label: "In progress", statuses: ["draft", "needs_clarification", "changes_requested"] },
  { label: "Pending approval", statuses: ["pending_approval"] },
  { label: "Approved", statuses: ["approved"] },
  { label: "Delivered", statuses: ["delivered"] },
];

export function StatusSummary({ statuses }: { statuses: ProposalStatus[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {SUMMARY_GROUPS.map((group) => {
        const count = statuses.filter((s) => group.statuses.includes(s)).length;
        return (
          <Card key={group.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{group.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{count}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
