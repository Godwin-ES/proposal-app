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
