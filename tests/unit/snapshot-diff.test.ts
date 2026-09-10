import { describe, expect, it } from "vitest";
import { diffChangedSections } from "@/lib/domain/snapshot-diff";
import type { ProposalSnapshot } from "@/lib/domain/types";

function baseSnapshot(): ProposalSnapshot {
  return {
    client: { clientName: "Jane Doe", companyName: "Acme Co", dateOfCall: "2026-01-15", salespersonName: "Sam Rep" },
    content: {
      introduction: "Intro.",
      projectScope: "Scope.",
      recommendedApproach: "Approach.",
      deliverables: ["A", "B"],
      timeline: "8 weeks",
      pricing: "USD 10,000",
      nextSteps: "Next.",
    },
  };
}

describe("diffChangedSections", () => {
  it("reports no sections when nothing changed", () => {
    const snapshot = baseSnapshot();
    expect(diffChangedSections(snapshot, { ...snapshot })).toEqual([]);
  });

  it("reports every section that actually differs, and only those", () => {
    const previous = baseSnapshot();
    const next = {
      ...previous,
      content: { ...previous.content, timeline: "10 weeks", pricing: "USD 12,000" },
    };
    expect(diffChangedSections(previous, next)).toEqual(["timeline", "pricing"]);
  });

  it("detects a deliverables change even when the array length is the same", () => {
    const previous = baseSnapshot();
    const next = { ...previous, content: { ...previous.content, deliverables: ["A", "C"] } };
    expect(diffChangedSections(previous, next)).toEqual(["deliverables"]);
  });

  it("does not count a field edited and then reverted back to its original value", () => {
    const previous = baseSnapshot();
    const touched = { ...previous, content: { ...previous.content, introduction: "Different." } };
    const revertedBack = { ...touched, content: { ...touched.content, introduction: previous.content.introduction } };
    expect(diffChangedSections(previous, revertedBack)).toEqual([]);
  });

  it("reports clientDetails when any client field changes", () => {
    const previous = baseSnapshot();
    const next = { ...previous, client: { ...previous.client, companyName: "New Co" } };
    expect(diffChangedSections(previous, next)).toEqual(["clientDetails"]);
  });
});
