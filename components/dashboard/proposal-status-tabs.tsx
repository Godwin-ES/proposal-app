"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecentProposals } from "@/components/dashboard/recent-proposals";
import type { ProposalRow } from "@/lib/repositories/proposals";
import type { ProposalStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type TabConfig = {
  key: string;
  label: string;
  statuses: ProposalStatus[];
  emptyTitle: string;
  emptyDescription: string;
};

const TABS: TabConfig[] = [
  {
    key: "in-progress",
    label: "In Progress",
    statuses: ["draft", "needs_clarification", "changes_requested"],
    emptyTitle: "Nothing in progress",
    emptyDescription: "Proposals you're drafting or revising will show up here.",
  },
  {
    key: "pending",
    label: "Pending Approval",
    statuses: ["pending_approval"],
    emptyTitle: "Nothing pending approval",
    emptyDescription: "Proposals you've submitted for review will show up here.",
  },
  {
    key: "approved",
    label: "Approved",
    statuses: ["approved"],
    emptyTitle: "Nothing approved yet",
    emptyDescription: "Proposals an approver has signed off on will show up here.",
  },
  {
    key: "delivered",
    label: "Delivered",
    statuses: ["delivered"],
    emptyTitle: "Nothing delivered yet",
    emptyDescription: "Proposals sent to a client will show up here.",
  },
];

export function ProposalStatusTabs({ proposals }: { proposals: ProposalRow[] }) {
  return (
    <Tabs defaultValue="in-progress" className="gap-0">
      <TabsList
        variant="line"
        className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0"
      >
        {TABS.map((tab) => {
          const count = proposals.filter((p) => tab.statuses.includes(p.status)).length;
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
          <RecentProposals
            proposals={proposals.filter((p) => tab.statuses.includes(p.status))}
            emptyTitle={tab.emptyTitle}
            emptyDescription={tab.emptyDescription}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
