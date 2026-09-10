"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalQueue, type ApprovalQueueRow } from "@/components/approvals/approval-queue";
import type { ProposalStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type TabConfig = {
  key: string;
  label: string;
  status: ProposalStatus;
  emptyTitle: string;
  emptyDescription: string;
};

const TABS: TabConfig[] = [
  {
    key: "pending",
    label: "Pending Approval",
    status: "pending_approval",
    emptyTitle: "Nothing waiting for review",
    emptyDescription: "Proposals submitted by a salesperson will appear here.",
  },
  {
    key: "changes-requested",
    label: "Changes Requested",
    status: "changes_requested",
    emptyTitle: "Nothing sent back yet",
    emptyDescription: "Proposals you've asked a salesperson to revise will appear here.",
  },
  {
    key: "approved",
    label: "Approved",
    status: "approved",
    emptyTitle: "Nothing approved yet",
    emptyDescription: "Proposals you've signed off on will appear here.",
  },
  {
    key: "delivered",
    label: "Delivered",
    status: "delivered",
    emptyTitle: "Nothing delivered yet",
    emptyDescription: "Proposals you approved that have since been sent to the client will appear here.",
  },
];

export function ApprovalStatusTabs({ rowsByStatus }: { rowsByStatus: Record<ProposalStatus, ApprovalQueueRow[]> }) {
  return (
    <Tabs defaultValue="pending" className="gap-0">
      <TabsList
        variant="line"
        className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0"
      >
        {TABS.map((tab) => {
          const count = rowsByStatus[tab.status]?.length ?? 0;
          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={cn(
                "group h-10 flex-none shrink-0 items-center gap-2 rounded-none border-0 border-b-2 border-transparent",
                "bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none after:hidden",
                "data-active:bg-transparent data-active:border-b-foreground data-active:text-foreground data-active:shadow-none"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums text-muted-foreground",
                  "group-data-active:bg-foreground group-data-active:text-background"
                )}
              >
                {count}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {TABS.map((tab) => (
        <TabsContent key={tab.key} value={tab.key} className="mt-4">
          <ApprovalQueue
            rows={rowsByStatus[tab.status] ?? []}
            emptyTitle={tab.emptyTitle}
            emptyDescription={tab.emptyDescription}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
