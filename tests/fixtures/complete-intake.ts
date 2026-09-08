import type { ProposalIntake } from "@/lib/domain/types";

export const completeIntake: ProposalIntake = {
  clientName: "Priya Natarajan",
  clientEmail: "priya@northfieldretail.test",
  companyName: "Northfield Retail Group",
  dateOfCall: "2026-02-03",
  salespersonName: "Sam Rep",
  clientNeedsSummary:
    "Northfield's store managers spend hours each week manually compiling inventory counts from spreadsheets emailed by each location.",
  projectScope:
    "Build a centralized inventory dashboard that ingests each store's weekly count and flags discrepancies automatically.",
  goalsAndObjectives: "Cut weekly reconciliation time by at least 70% and reduce stockout incidents.",
  recommendedServices: "Inventory dashboard, automated discrepancy alerts, manager training session.",
  proposedTimeline: "8 weeks",
  estimatedPricing: "$18,500",
};
