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

  it("blocks generation when pricing is missing", () => {
    const blockers = evaluateGenerationReadiness({ ...completeIntake, estimatedPricing: "" });
    expect(blockers).toContain("Estimated Pricing");
  });

  it("blocks generation when recommended services are missing", () => {
    const blockers = evaluateGenerationReadiness({ ...completeIntake, recommendedServices: "" });
    expect(blockers).toContain("Recommended Services / Deliverables");
  });

  it("blocks generation when proposed timeline is missing", () => {
    const blockers = evaluateGenerationReadiness({ ...completeIntake, proposedTimeline: "" });
    expect(blockers).toContain("Proposed Timeline");
  });

  it("blocks generation when date of call is missing", () => {
    const blockers = evaluateGenerationReadiness({ ...completeIntake, dateOfCall: "" });
    expect(blockers).toContain("Date of Call");
  });
});

describe("evaluateApprovalReadiness", () => {
  it("has no blockers when the snapshot is complete", () => {
    expect(evaluateApprovalReadiness({ snapshot: completeSnapshot, hasCurrentVersion: true })).toEqual([]);
  });

  it("blocks approval when pricing content is missing", () => {
    const blockers = evaluateApprovalReadiness({
      snapshot: { ...completeSnapshot, content: { ...completeSnapshot.content, pricing: "" } },
      hasCurrentVersion: true,
    });
    expect(blockers).toContain("Pricing");
  });

  it("blocks approval when there is no current version", () => {
    const blockers = evaluateApprovalReadiness({ snapshot: null, hasCurrentVersion: false });
    expect(blockers.length).toBeGreaterThan(0);
  });

  it("blocks approval when deliverables are empty", () => {
    const blockers = evaluateApprovalReadiness({
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
});
