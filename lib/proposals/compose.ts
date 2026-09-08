import type { ProposalIntake, ProposalSectionKey, ProposalSnapshot } from "@/lib/domain/types";
import type { GeneratedSections } from "@/lib/ai/schemas";
import { buildNextSteps } from "@/lib/templates/proposal";

/**
 * Composes Version 1 from the pre-generation intake and validated AI output.
 * Timeline, pricing, and client metadata are deterministically anchored to
 * intake — the AI output contract has no fields for them, so there is
 * nothing for a hostile/miscalibrated provider response to overwrite.
 */
export function composeInitialSnapshot(
  intake: ProposalIntake,
  generated: GeneratedSections
): ProposalSnapshot {
  return {
    client: {
      clientName: intake.clientName,
      companyName: intake.companyName,
      dateOfCall: intake.dateOfCall,
      salespersonName: intake.salespersonName,
    },
    content: {
      introduction: generated.introduction,
      projectScope: generated.projectScope,
      recommendedApproach: generated.recommendedApproach,
      deliverables: generated.deliverables,
      timeline: intake.proposedTimeline,
      pricing: intake.estimatedPricing,
      nextSteps: buildNextSteps(),
    },
  };
}

type TargetContent<K extends ProposalSectionKey> = K extends "deliverables" ? string[] : string;

/**
 * Replaces only the targeted section of the current snapshot. Every other
 * client-facing field (including client metadata, timeline, and pricing)
 * is carried over unchanged so a targeted regeneration can never revert a
 * manually corrected value.
 */
export function composeRegeneratedSnapshot<K extends ProposalSectionKey>(
  currentSnapshot: ProposalSnapshot,
  target: K,
  newContent: TargetContent<K>
): ProposalSnapshot {
  return {
    client: { ...currentSnapshot.client },
    content: {
      ...currentSnapshot.content,
      [target]: newContent,
    },
  };
}
