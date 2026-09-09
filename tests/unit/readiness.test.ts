import { describe, expect, it } from "vitest";
import {
  evaluateGenerationReadiness,
  evaluateApprovalReadiness,
  evaluateDeliveryReadiness,
} from "@/lib/domain/readiness";
import type { ProposalIntake, ProposalSnapshot } from "@/lib/domain/types";

const completeIntake: ProposalIntake = {
  clientName: "Jane Doe",
  clientEmail: "jane@acme.test",
  companyName: "Acme Co",
  dateOfCall: "2026-01-15",
  salespersonName: "Sam Rep",
  clientNeedsSummary: "Faster onboarding",
  projectScope: "Build onboarding portal",
  goalsAndObjectives: "Reduce onboarding time",
  recommendedServices: "Portal + training",
  proposedTimeline: "6 weeks",
  estimatedPricing: "$12,000",
};

const completeSnapshot: ProposalSnapshot = {
  client: {
    clientName: "Jane Doe",
    companyName: "Acme Co",
    dateOfCall: "2026-01-15",
    salespersonName: "Sam Rep",
  },
  content: {
    introduction: "intro",
    projectScope: "scope",
    recommendedApproach: "approach",
    deliverables: ["item one"],
    timeline: "6 weeks",
    pricing: "$12,000",
    nextSteps: "next",
  },
};

describe("evaluateGenerationReadiness", () => {
  it("has no blockers for a complete intake", () => {
    expect(evaluateGenerationReadiness(completeIntake)).toEqual([]);
  });

  it("blocks generation when project scope is missing", () => {
    const blockers = evaluateGenerationReadiness({ ...completeIntake, projectScope: "" });
    expect(blockers).toContain("Project Scope");
  });

  it("does not block generation when pricing is missing", () => {
    const blockers = evaluateGenerationReadiness({ ...completeIntake, estimatedPricing: "" });
    expect(blockers).toEqual([]);
  });
});

describe("evaluateApprovalReadiness", () => {
  it("has no blockers when intake and snapshot are complete", () => {
    expect(
      evaluateApprovalReadiness({ intake: completeIntake, snapshot: completeSnapshot, hasCurrentVersion: true })
    ).toEqual([]);
  });

  it("blocks approval when pricing is missing even though generation succeeded", () => {
    const blockers = evaluateApprovalReadiness({
      intake: { ...completeIntake, estimatedPricing: "" },
      snapshot: { ...completeSnapshot, content: { ...completeSnapshot.content, pricing: "" } },
      hasCurrentVersion: true,
    });
    expect(blockers).toContain("Estimated Pricing");
  });

  it("blocks approval when there is no current version", () => {
    const blockers = evaluateApprovalReadiness({
      intake: completeIntake,
      snapshot: null,
      hasCurrentVersion: false,
    });
    expect(blockers.length).toBeGreaterThan(0);
  });

  it("blocks approval when deliverables are empty", () => {
    const blockers = evaluateApprovalReadiness({
      intake: completeIntake,
      snapshot: { ...completeSnapshot, content: { ...completeSnapshot.content, deliverables: [] } },
      hasCurrentVersion: true,
    });
    expect(blockers).toContain("Deliverables");
  });
});

describe("evaluateDeliveryReadiness", () => {
  const readyBase = {
    clientEmail: "jane@acme.test",
    status: "approved" as const,
    isCurrentVersionApproved: true,
    pdfStatus: "ready" as const,
    hasUnresolvedUncertainAttempt: false,
  };

  it("has no blockers when fully ready", () => {
    expect(evaluateDeliveryReadiness(readyBase)).toEqual([]);
  });

  it("blocks delivery when client email is missing", () => {
    expect(evaluateDeliveryReadiness({ ...readyBase, clientEmail: "" }).length).toBeGreaterThan(0);
  });

  it("blocks delivery when proposal is not approved", () => {
    expect(evaluateDeliveryReadiness({ ...readyBase, status: "draft" as const }).length).toBeGreaterThan(0);
  });

  it("blocks delivery when current version is not the approved version", () => {
    expect(evaluateDeliveryReadiness({ ...readyBase, isCurrentVersionApproved: false }).length).toBeGreaterThan(0);
  });

  it("blocks delivery when pdf is not ready", () => {
    expect(evaluateDeliveryReadiness({ ...readyBase, pdfStatus: "not_generated" as const }).length).toBeGreaterThan(0);
  });

  it("blocks delivery when an uncertain attempt is unresolved", () => {
    expect(evaluateDeliveryReadiness({ ...readyBase, hasUnresolvedUncertainAttempt: true }).length).toBeGreaterThan(0);
  });

  it("reports an already-delivered proposal distinctly, not as a missing-approval blocker", () => {
    const blockers = evaluateDeliveryReadiness({ ...readyBase, status: "delivered" as const });
    expect(blockers).toEqual(["This proposal has already been delivered"]);
    expect(blockers).not.toContain("Internal approval of the current version");
  });
});
