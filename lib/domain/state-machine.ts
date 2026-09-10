import { EDITABLE_STATUSES, type ProposalStatus } from "@/lib/domain/types";
import { ProposalStatusError } from "@/lib/domain/errors";

export function isEditableStatus(status: ProposalStatus): boolean {
  return (EDITABLE_STATUSES as string[]).includes(status);
}

export function assertEditableStatus(status: ProposalStatus): void {
  if (!isEditableStatus(status)) {
    throw new ProposalStatusError(
      status === "delivered"
        ? "This proposal has been delivered and is read-only."
        : status === "pending_approval"
          ? "This proposal is awaiting approval and cannot be edited right now."
          : `This proposal cannot be edited in its current status (${status}).`
    );
  }
}

const VERSION_WRITE_BLOCKED_STATUSES: ProposalStatus[] = ["pending_approval", "delivered"];

/**
 * A new proposal version may be created from `approved` (that's exactly how
 * a post-approval correction returns the proposal to an editable state), so
 * this is deliberately a wider check than `isEditableStatus`/`assertEditableStatus`,
 * which govern intake/material edits that must NOT be allowed on an approved
 * proposal.
 */
export function isVersionWritableStatus(status: ProposalStatus): boolean {
  return !VERSION_WRITE_BLOCKED_STATUSES.includes(status);
}

export function assertVersionWritableStatus(status: ProposalStatus): void {
  if (VERSION_WRITE_BLOCKED_STATUSES.includes(status)) {
    throw new ProposalStatusError(
      status === "delivered"
        ? "This proposal has been delivered and is read-only."
        : "This proposal is awaiting approval and cannot be revised right now."
    );
  }
}

export function computeEditableStatus(
  approvalBlockers: string[],
  warnings: unknown[]
): "draft" | "needs_clarification" {
  return approvalBlockers.length > 0 || warnings.length > 0 ? "needs_clarification" : "draft";
}
