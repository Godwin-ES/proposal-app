import type { ProposalIntake, ProposalSnapshot, ProposalStatus } from "@/lib/domain/types";

function isBlank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

export function evaluateGenerationReadiness(intake: ProposalIntake): string[] {
  const blockers: string[] = [];
  if (isBlank(intake.clientName)) blockers.push("Client Name");
  if (isBlank(intake.companyName)) blockers.push("Company Name");
  // Saved via its own "Save Email" action, independent of Save Intake (see
  // components/proposals/intake-form.tsx) — easy to type in and forget to
  // actually save, which otherwise only surfaces much later at delivery.
  if (isBlank(intake.clientEmail)) blockers.push("Client Email");
  if (isBlank(intake.salespersonName)) blockers.push("Salesperson Name");
  if (isBlank(intake.dateOfCall)) blockers.push("Date of Call");
  if (isBlank(intake.clientNeedsSummary)) blockers.push("Summary of Client's Needs");
  if (isBlank(intake.projectScope)) blockers.push("Project Scope");
  if (isBlank(intake.goalsAndObjectives)) blockers.push("Goals and Objectives");
  if (isBlank(intake.recommendedServices)) blockers.push("Recommended Services / Deliverables");
  if (isBlank(intake.proposedTimeline)) blockers.push("Proposed Timeline");
  if (isBlank(intake.estimatedPricing)) blockers.push("Estimated Pricing");
  return blockers;
}

export function evaluateApprovalReadiness(input: {
  snapshot: ProposalSnapshot | null;
  hasCurrentVersion: boolean;
}): string[] {
  const { snapshot, hasCurrentVersion } = input;
  const blockers: string[] = [];

  // Date of Call, Recommended Services, Proposed Timeline, and Estimated
  // Pricing are no longer checked here: they're required for generation
  // itself (evaluateGenerationReadiness) and intake fields are frozen the
  // moment a version exists (see update_pre_generation_intake in
  // supabase/migrations/003_week3_business_rpcs.sql), so they can never be
  // blank by the time a version exists to approve.

  if (!hasCurrentVersion || !snapshot) {
    blockers.push("A generated proposal version");
    return dedupe(blockers);
  }

  const { content } = snapshot;
  if (isBlank(content.introduction)) blockers.push("Introduction");
  if (isBlank(content.projectScope)) blockers.push("Project Scope");
  if (isBlank(content.recommendedApproach)) blockers.push("Recommended Approach");
  if (!content.deliverables || content.deliverables.filter((d) => !isBlank(d)).length === 0) {
    blockers.push("Deliverables");
  }
  if (isBlank(content.timeline)) blockers.push("Timeline");
  if (isBlank(content.pricing)) blockers.push("Pricing");
  if (isBlank(content.nextSteps)) blockers.push("Next Steps");

  return dedupe(blockers);
}

export function evaluateDeliveryReadiness(input: {
  clientEmail: string;
  status: ProposalStatus;
  isCurrentVersionApproved: boolean;
  pdfStatus: "not_generated" | "generating" | "ready" | "failed";
  hasUnresolvedUncertainAttempt: boolean;
}): string[] {
  const blockers: string[] = [];

  if (isBlank(input.clientEmail)) blockers.push("A valid client email address");
  if (input.status !== "approved") blockers.push("Internal approval of the current version");
  if (!input.isCurrentVersionApproved) blockers.push("Current version must match the approved version");
  if (input.pdfStatus !== "ready") blockers.push("A ready final PDF for the current version");
  if (input.hasUnresolvedUncertainAttempt) {
    blockers.push("An earlier delivery attempt has an uncertain outcome that must be resolved first");
  }

  return dedupe(blockers);
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}
