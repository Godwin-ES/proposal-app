import type { ProposalIntake, ProposalSnapshot, ProposalStatus } from "@/lib/domain/types";

function isBlank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

/**
 * `documentProvidesFields` is the salesperson's pre-generation declaration
 * that supporting material already contains the answers to some of these
 * fields (see `document_provides_fields` on `proposals`). When set, the
 * narrative/identity fields below may stay blank — generation is expected to
 * draw them from supporting material instead (see composeInitialSnapshot) —
 * but at least one successfully-extracted material must actually exist, or
 * there is nothing for that promise to draw from. Salesperson Name, Date of
 * Call, Proposed Timeline, and Estimated Pricing are never relaxed: the
 * first two are internal process metadata no client document would state,
 * and the latter two the AI is never allowed to invent — a document may only
 * ever fill them in when they're still at their untouched default (see
 * composeInitialSnapshot), which this readiness check can't observe.
 */
export function evaluateGenerationReadiness(
  intake: ProposalIntake,
  options: { documentProvidesFields?: boolean; hasReadyMaterial?: boolean } = {}
): string[] {
  const { documentProvidesFields = false, hasReadyMaterial = false } = options;
  const blockers: string[] = [];

  if (documentProvidesFields && !hasReadyMaterial) {
    blockers.push("At least one successfully processed supporting file (to draw the declared fields from)");
  }

  if (!documentProvidesFields) {
    if (isBlank(intake.clientName)) blockers.push("Client Name");
    if (isBlank(intake.companyName)) blockers.push("Company Name");
    if (isBlank(intake.clientNeedsSummary)) blockers.push("Summary of Client's Needs");
    if (isBlank(intake.projectScope)) blockers.push("Project Scope");
    if (isBlank(intake.goalsAndObjectives)) blockers.push("Goals and Objectives");
    if (isBlank(intake.recommendedServices)) blockers.push("Recommended Services / Deliverables");
  }

  // Client Email is delivery routing metadata, not something generation
  // needs — it's enforced by evaluateDeliveryReadiness instead, right
  // before it actually matters.
  if (isBlank(intake.salespersonName)) blockers.push("Salesperson Name");
  if (isBlank(intake.dateOfCall)) blockers.push("Date of Call");
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
