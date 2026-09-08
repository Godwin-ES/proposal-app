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

export function computeEditableStatus(
  approvalBlockers: string[],
  warnings: string[]
): "draft" | "needs_clarification" {
  return approvalBlockers.length > 0 || warnings.length > 0 ? "needs_clarification" : "draft";
}
