import { describe, expect, it } from "vitest";
import { proposalIntakeSchema, proposalBodySchema, proposalSnapshotSchema } from "@/lib/domain/schemas";

describe("proposalIntakeSchema", () => {
  const base = {
    clientName: "Jane Doe",
    clientEmail: "",
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

  it("allows a blank clientEmail in a draft", () => {
    expect(proposalIntakeSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a malformed non-empty email", () => {
    const result = proposalIntakeSchema.safeParse({ ...base, clientEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid non-empty email", () => {
    const result = proposalIntakeSchema.safeParse({ ...base, clientEmail: "jane@acme.test" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date of call", () => {
    const result = proposalIntakeSchema.safeParse({ ...base, dateOfCall: "15/01/2026" });
    expect(result.success).toBe(false);
  });

  it("allows a blank date of call", () => {
    const result = proposalIntakeSchema.safeParse({ ...base, dateOfCall: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a date of call in the future", () => {
    const farFuture = `${new Date().getFullYear() + 5}-01-01`;
    const result = proposalIntakeSchema.safeParse({ ...base, dateOfCall: farFuture });
    expect(result.success).toBe(false);
  });

  it("accepts today as a date of call", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = proposalIntakeSchema.safeParse({ ...base, dateOfCall: today });
    expect(result.success).toBe(true);
  });
});

describe("proposalBodySchema", () => {
  const base = {
    introduction: "intro",
    projectScope: "scope",
    recommendedApproach: "approach",
    deliverables: ["one"],
    timeline: "6 weeks",
    pricing: "$12,000",
    nextSteps: "next",
  };

  it("accepts a complete body", () => {
    expect(proposalBodySchema.safeParse(base).success).toBe(true);
  });

  it("rejects zero deliverables", () => {
    expect(proposalBodySchema.safeParse({ ...base, deliverables: [] }).success).toBe(false);
  });

  it("rejects an empty introduction", () => {
    expect(proposalBodySchema.safeParse({ ...base, introduction: "" }).success).toBe(false);
  });
});

describe("proposalSnapshotSchema", () => {
  const baseSnapshot = {
    client: { clientName: "Jane Doe", companyName: "Acme Co", dateOfCall: "2026-01-15", salespersonName: "Sam Rep" },
    content: {
      introduction: "intro",
      projectScope: "scope",
      recommendedApproach: "approach",
      deliverables: ["one"],
      timeline: "6 weeks",
      pricing: "$12,000",
      nextSteps: "next",
    },
  };

  it("accepts a valid snapshot", () => {
    expect(proposalSnapshotSchema.safeParse(baseSnapshot).success).toBe(true);
  });

  it("rejects a snapshot with a future date of call", () => {
    const farFuture = `${new Date().getFullYear() + 5}-01-01`;
    const result = proposalSnapshotSchema.safeParse({
      ...baseSnapshot,
      client: { ...baseSnapshot.client, dateOfCall: farFuture },
    });
    expect(result.success).toBe(false);
  });
});
