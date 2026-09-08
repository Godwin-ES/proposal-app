import { describe, expect, it } from "vitest";
import { composeInitialSnapshot, composeRegeneratedSnapshot } from "@/lib/proposals/compose";
import { buildNextSteps } from "@/lib/templates/proposal";
import type { ProposalIntake, ProposalSnapshot } from "@/lib/domain/types";
import type { GeneratedSections } from "@/lib/ai/schemas";

const intake: ProposalIntake = {
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

const generated: GeneratedSections = {
  introduction: "AI intro",
  projectScope: "AI scope",
  recommendedApproach: "AI approach",
  deliverables: ["AI deliverable one"],
  clarificationFlags: [],
  supportingMaterialUsage: [],
};

describe("composeInitialSnapshot", () => {
  it("uses intake timeline/pricing/client metadata even if the AI output tried to differ", () => {
    const generatedWithPricingAttempt = {
      ...generated,
      // GeneratedSections has no pricing/timeline fields at the type level;
      // simulate a hostile provider payload bypassing validation.
    } as GeneratedSections & { pricing?: string; timeline?: string };
    generatedWithPricingAttempt.pricing = "$1";
    generatedWithPricingAttempt.timeline = "1 day";

    const snapshot = composeInitialSnapshot(intake, generatedWithPricingAttempt);

    expect(snapshot.content.pricing).toBe("$12,000");
    expect(snapshot.content.timeline).toBe("6 weeks");
    expect(snapshot.client.clientName).toBe("Jane Doe");
    expect(snapshot.client.companyName).toBe("Acme Co");
    expect(snapshot.content.nextSteps).toBe(buildNextSteps());
  });

  it("does not include clientEmail in the snapshot", () => {
    const snapshot = composeInitialSnapshot(intake, generated);
    expect((snapshot as unknown as { clientEmail?: string }).clientEmail).toBeUndefined();
  });
});

describe("composeRegeneratedSnapshot", () => {
  const currentSnapshot: ProposalSnapshot = {
    client: {
      clientName: "Jane Doe",
      companyName: "Acme Co",
      dateOfCall: "2026-01-15",
      salespersonName: "Sam Rep",
    },
    content: {
      introduction: "current intro",
      projectScope: "current scope",
      recommendedApproach: "current approach",
      deliverables: ["current deliverable"],
      timeline: "6 weeks",
      pricing: "$12,000",
      nextSteps: "current next steps",
    },
  };

  it("preserves every non-target field exactly", () => {
    const next = composeRegeneratedSnapshot(currentSnapshot, "deliverables", ["new deliverable"]);

    expect(next.client).toEqual(currentSnapshot.client);
    expect(next.content.introduction).toBe(currentSnapshot.content.introduction);
    expect(next.content.projectScope).toBe(currentSnapshot.content.projectScope);
    expect(next.content.recommendedApproach).toBe(currentSnapshot.content.recommendedApproach);
    expect(next.content.timeline).toBe(currentSnapshot.content.timeline);
    expect(next.content.pricing).toBe(currentSnapshot.content.pricing);
    expect(next.content.nextSteps).toBe(currentSnapshot.content.nextSteps);
    expect(next.content.deliverables).toEqual(["new deliverable"]);
  });

  it("replaces only the introduction when targeted", () => {
    const next = composeRegeneratedSnapshot(currentSnapshot, "introduction", "new intro");
    expect(next.content.introduction).toBe("new intro");
    expect(next.content.deliverables).toEqual(currentSnapshot.content.deliverables);
  });
});
