import { describe, expect, it } from "vitest";
import { composeInitialSnapshot, composeRegeneratedSnapshot } from "@/lib/proposals/compose";
import { buildNextSteps } from "@/lib/templates/proposal";
import { placeholderContent } from "@/lib/domain/section-labels";
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

const noFieldsFromMaterial = { clientName: null, companyName: null, timeline: null, pricing: null };

const generated: GeneratedSections = {
  introduction: "AI intro",
  projectScope: "AI scope",
  recommendedApproach: "AI approach",
  deliverables: ["AI deliverable one"],
  clarificationFlags: [],
  supportingMaterialUsage: [],
  fieldsFromMaterial: noFieldsFromMaterial,
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

    const { snapshot } = composeInitialSnapshot(intake, generatedWithPricingAttempt, false);

    expect(snapshot.content.pricing).toBe("$12,000");
    expect(snapshot.content.timeline).toBe("6 weeks");
    expect(snapshot.client.clientName).toBe("Jane Doe");
    expect(snapshot.client.companyName).toBe("Acme Co");
    expect(snapshot.content.nextSteps).toBe(buildNextSteps());
  });

  it("does not include clientEmail in the snapshot", () => {
    const { snapshot } = composeInitialSnapshot(intake, generated, false);
    expect((snapshot as unknown as { clientEmail?: string }).clientEmail).toBeUndefined();
  });

  it("never fills a blank identity field from material unless documentProvidesFields is set", () => {
    const blankIntake = { ...intake, clientName: "", companyName: "" };
    const withMaterial = { ...generated, fieldsFromMaterial: { ...noFieldsFromMaterial, clientName: "Found Name", companyName: "Found Co" } };

    const { snapshot, additionalFlags } = composeInitialSnapshot(blankIntake, withMaterial, false);

    expect(snapshot.client.clientName).toBe(placeholderContent("Client Name"));
    expect(snapshot.client.companyName).toBe(placeholderContent("Company Name"));
    expect(additionalFlags).toHaveLength(2);
    expect(additionalFlags.every((f) => f.section === "general")).toBe(true);
  });

  it("fills a blank identity field from material when documentProvidesFields is set", () => {
    const blankIntake = { ...intake, clientName: "", companyName: "" };
    const withMaterial = { ...generated, fieldsFromMaterial: { ...noFieldsFromMaterial, clientName: "Found Name", companyName: "Found Co" } };

    const { snapshot, additionalFlags } = composeInitialSnapshot(blankIntake, withMaterial, true);

    expect(snapshot.client.clientName).toBe("Found Name");
    expect(snapshot.client.companyName).toBe("Found Co");
    expect(additionalFlags).toHaveLength(0);
  });

  it("placeholders and flags a blank identity field when material has nothing either, even with the checkbox on", () => {
    const blankIntake = { ...intake, clientName: "" };
    const { snapshot, additionalFlags } = composeInitialSnapshot(blankIntake, generated, true);

    expect(snapshot.client.clientName).toBe(placeholderContent("Client Name"));
    expect(additionalFlags).toHaveLength(1);
    expect(additionalFlags[0].message).toContain("Client Name");
  });

  it("never overrides a non-blank identity field from material, even with the checkbox on", () => {
    const withContradiction = { ...generated, fieldsFromMaterial: { ...noFieldsFromMaterial, clientName: "Someone Else" } };
    const { snapshot, additionalFlags } = composeInitialSnapshot(intake, withContradiction, true);

    expect(snapshot.client.clientName).toBe("Jane Doe");
    expect(additionalFlags).toHaveLength(0);
  });

  it("fills timeline/pricing from material only when still at the untouched default and the checkbox is on", () => {
    const untouchedIntake = { ...intake, proposedTimeline: "1 week", estimatedPricing: "USD 1" };
    const withMaterial = {
      ...generated,
      fieldsFromMaterial: { ...noFieldsFromMaterial, timeline: { amount: 8, unit: "weeks" as const }, pricing: { amount: 18500, currency: "USD" as const } },
    };

    const { snapshot: withoutCheckbox } = composeInitialSnapshot(untouchedIntake, withMaterial, false);
    expect(withoutCheckbox.content.timeline).toBe("1 week");
    expect(withoutCheckbox.content.pricing).toBe("USD 1");

    const { snapshot: withCheckbox } = composeInitialSnapshot(untouchedIntake, withMaterial, true);
    expect(withCheckbox.content.timeline).toBe("8 weeks");
    expect(withCheckbox.content.pricing).toBe("USD 18,500");
  });

  it("never overrides a deliberately-set timeline/pricing value even with the checkbox on", () => {
    const withMaterial = {
      ...generated,
      fieldsFromMaterial: { ...noFieldsFromMaterial, timeline: { amount: 8, unit: "weeks" as const } },
    };
    const { snapshot } = composeInitialSnapshot(intake, withMaterial, true);
    expect(snapshot.content.timeline).toBe("6 weeks");
  });

  it("adds a safety-net flag when the model wrote a section placeholder without flagging it", () => {
    const withUnflaggedPlaceholder = { ...generated, introduction: placeholderContent("Introduction") };
    const { additionalFlags } = composeInitialSnapshot(intake, withUnflaggedPlaceholder, false);

    expect(additionalFlags).toHaveLength(1);
    expect(additionalFlags[0]).toMatchObject({ section: "introduction" });
  });

  it("does not double-flag a section placeholder the model already flagged", () => {
    const withFlaggedPlaceholder = {
      ...generated,
      introduction: placeholderContent("Introduction"),
      clarificationFlags: [{ section: "introduction" as const, message: "No basis to write this from." }],
    };
    const { additionalFlags } = composeInitialSnapshot(intake, withFlaggedPlaceholder, false);

    expect(additionalFlags).toHaveLength(0);
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
