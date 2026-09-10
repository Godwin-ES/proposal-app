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

/**
 * Broader than ProposalSectionKey — every field a manual edit in the
 * proposal workspace can touch, for labeling version history ("what
 * changed"). Only the ProposalSectionKey subset is AI-regeneratable and
 * only that subset can clear a clarification flag (see
 * carryForwardClarificationFlags) — a Next Steps/Timeline/Pricing/Client
 * Details edit is still recorded here for history, it just never resolves
 * an AI-raised flag.
 */
export type ChangedSectionLabel = ProposalSectionKey | "nextSteps" | "timeline" | "pricing" | "clientDetails";

/**
 * An AI-raised concern about a generated version. `section` ties it to the
 * content section that resolves it — editing or regenerating that section
 * automatically marks it "resolved" (see carryForwardClarificationFlags in
 * lib/domain/clarification.ts). `section: null` is for concerns that aren't
 * about one section (e.g. an uploaded file that seems unrelated to this
 * proposal entirely) — those only change status via an explicit dismiss,
 * since there's no single section whose edit would resolve them.
 *
 * Flags are never deleted once raised, only re-statused — an Approver
 * should still be able to see that something was flagged even after Sales
 * dismissed or resolved it, not just while it's still open. Only "open"
 * flags block submission or show in the Salesperson's actionable banner;
 * the Approver's review sees the full history regardless of status.
 */
export type ClarificationFlag = {
  id: string;
  section: ProposalSectionKey | null;
  message: string;
  status: "open" | "dismissed" | "resolved";
};

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
  | "STORAGE_CLEANUP_FAILED"
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
