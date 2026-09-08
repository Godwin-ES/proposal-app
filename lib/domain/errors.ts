import type { ActionError, ProposalErrorCode } from "@/lib/domain/types";

export class DomainError extends Error {
  code: ProposalErrorCode;
  stage: string;
  retrySafe: boolean;

  constructor(code: ProposalErrorCode, stage: string, message: string, retrySafe: boolean) {
    super(message);
    this.code = code;
    this.stage = stage;
    this.retrySafe = retrySafe;
  }

  toActionError(context?: { proposalId?: string; versionId?: string }): ActionError {
    return {
      code: this.code,
      stage: this.stage,
      message: this.message,
      retrySafe: this.retrySafe,
      ...context,
    };
  }
}

export class ProposalStatusError extends DomainError {
  constructor(message: string) {
    super("INVALID_STATE", "status-check", message, false);
  }
}

export class StaleVersionError extends DomainError {
  constructor(message = "This proposal changed since you loaded it. Reload and try again.") {
    super("STALE_VERSION", "version-write", message, true);
  }
}

export class ReadinessError extends DomainError {
  constructor(message: string) {
    super("READINESS_ERROR", "readiness-check", message, true);
  }
}

export class PermissionDeniedError extends DomainError {
  constructor(message = "You are not allowed to perform this action.") {
    super("PERMISSION_DENIED", "authorization", message, false);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "The requested record was not found.") {
    super("NOT_FOUND", "lookup", message, false);
  }
}

/**
 * Every business RPC (lib/supabase RPCs in supabase/migrations/003) raises
 * `raise exception 'CODE: message'`. This maps that Postgres error message
 * back into a typed DomainError instead of leaking raw SQL text to the UI.
 */
const RPC_ERROR_CODES: Array<{ prefix: string; code: DomainError["code"]; retrySafe: boolean }> = [
  { prefix: "NOT_FOUND", code: "NOT_FOUND", retrySafe: false },
  { prefix: "PERMISSION_DENIED", code: "PERMISSION_DENIED", retrySafe: false },
  { prefix: "STALE_VERSION", code: "STALE_VERSION", retrySafe: true },
  { prefix: "INVALID_STATE", code: "INVALID_STATE", retrySafe: false },
  { prefix: "VALIDATION_ERROR", code: "VALIDATION_ERROR", retrySafe: true },
  { prefix: "READINESS_ERROR", code: "READINESS_ERROR", retrySafe: true },
  { prefix: "APPROVAL_REQUIRED", code: "APPROVAL_REQUIRED", retrySafe: false },
  { prefix: "MATERIAL_UPLOAD_FAILED", code: "MATERIAL_UPLOAD_FAILED", retrySafe: true },
  { prefix: "MATERIAL_EXTRACTION_FAILED", code: "MATERIAL_EXTRACTION_FAILED", retrySafe: true },
  { prefix: "MATERIAL_LIMIT_EXCEEDED", code: "MATERIAL_LIMIT_EXCEEDED", retrySafe: false },
  { prefix: "AI_PROVIDER_FAILED", code: "AI_PROVIDER_FAILED", retrySafe: true },
  { prefix: "AI_OUTPUT_INVALID", code: "AI_OUTPUT_INVALID", retrySafe: true },
  { prefix: "DOCUMENT_GENERATION_FAILED", code: "DOCUMENT_GENERATION_FAILED", retrySafe: true },
  { prefix: "DELIVERY_PREPARATION_FAILED", code: "DELIVERY_PREPARATION_FAILED", retrySafe: true },
  { prefix: "DELIVERY_FAILED", code: "DELIVERY_FAILED", retrySafe: true },
  { prefix: "DELIVERY_OUTCOME_UNCERTAIN", code: "DELIVERY_OUTCOME_UNCERTAIN", retrySafe: false },
];

export function mapRpcError(error: { message: string }, stage: string): DomainError {
  const match = RPC_ERROR_CODES.find((entry) => error.message.includes(`${entry.prefix}:`));
  if (!match) {
    return new DomainError("VALIDATION_ERROR", stage, error.message, false);
  }
  const message = error.message.slice(error.message.indexOf(`${match.prefix}:`) + match.prefix.length + 1).trim();
  return new DomainError(match.code, stage, message, match.retrySafe);
}
