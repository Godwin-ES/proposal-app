export type Role = "salesperson" | "approver";

export type ProposalStatus =
  | "draft"
  | "needs_clarification"
  | "pending_approval"
  | "approved"
  | "changes_requested"
  | "delivered";

export const EDITABLE_STATUSES: ProposalStatus[] = [
  "draft",
  "needs_clarification",
  "changes_requested",
];

export type ProposalChangeType =
  | "initial_generation"
  | "manual_edit"
  | "section_regeneration";

export type GenerationProvider = "anthropic" | "google";

export type GenerationStatus = "running" | "succeeded" | "failed" | "stale";

export type DeliveryStatus = "pending" | "sent" | "failed" | "uncertain";

export type ProposalSectionKey =
  | "introduction"
  | "projectScope"
  | "recommendedApproach"
  | "deliverables";

export const PROPOSAL_SECTION_KEYS: ProposalSectionKey[] = [
  "introduction",
  "projectScope",
  "recommendedApproach",
  "deliverables",
];

export type ProposalIntake = {
  clientName: string;
  clientEmail: string;
  companyName: string;
  dateOfCall: string;
  salespersonName: string;
  clientNeedsSummary: string;
  projectScope: string;
  goalsAndObjectives: string;
  recommendedServices: string;
  proposedTimeline: string;
  estimatedPricing: string;
};

export type ProposalBody = {
  introduction: string;
  projectScope: string;
  recommendedApproach: string;
  deliverables: string[];
  timeline: string;
  pricing: string;
  nextSteps: string;
};

export type ProposalSnapshot = {
  client: {
    clientName: string;
    companyName: string;
    dateOfCall: string;
    salespersonName: string;
  };
  content: ProposalBody;
};

export type ReadinessResult = {
  generationBlockers: string[];
  approvalBlockers: string[];
  deliveryBlockers: string[];
  warnings: string[];
};

export type ProposalErrorCode =
  | "VALIDATION_ERROR"
  | "READINESS_ERROR"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "STALE_VERSION"
  | "INVALID_STATE"
  | "APPROVAL_REQUIRED"
  | "MATERIAL_UPLOAD_FAILED"
  | "MATERIAL_EXTRACTION_FAILED"
  | "MATERIAL_LIMIT_EXCEEDED"
  | "AI_PROVIDER_FAILED"
  | "AI_OUTPUT_INVALID"
  | "DOCUMENT_GENERATION_FAILED"
  | "DELIVERY_PREPARATION_FAILED"
  | "DELIVERY_FAILED"
  | "DELIVERY_OUTCOME_UNCERTAIN";

export type ActionError = {
  code: ProposalErrorCode;
  stage: string;
  message: string;
  retrySafe: boolean;
  proposalId?: string;
  versionId?: string;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };
