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
    <Tabs defaultValue="in-progress" className="gap-4">
      <TabsList
        variant="line"
        className="grid h-auto w-full grid-cols-2 gap-0 rounded-none border-b bg-transparent p-0 sm:grid-cols-4"
      >
        {TABS.map((tab) => {
          const count = proposals.filter((p) => tab.statuses.includes(p.status)).length;
          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={cn(
                "group h-auto w-full flex-none flex-col items-start gap-1.5 rounded-none border-0 border-b-2 border-transparent",
                "bg-transparent px-3 pt-1 pb-3 text-left shadow-none after:hidden",
                "data-active:bg-transparent data-active:border-b-foreground data-active:shadow-none"
              )}
            >
              <span className="text-sm font-medium text-muted-foreground group-data-active:text-foreground">
                {tab.label}
              </span>
              <span className="text-2xl leading-none font-semibold tabular-nums text-foreground">{count}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {TABS.map((tab) => (
        <TabsContent key={tab.key} value={tab.key}>
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
