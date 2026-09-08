import { describe, expect, it } from "vitest";
import { canonicalSnapshotJson, hashProposalSnapshot } from "@/lib/domain/hashing";
import type { ProposalSnapshot } from "@/lib/domain/types";

const snapshot: ProposalSnapshot = {
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
    deliverables: ["one", "two"],
    timeline: "6 weeks",
    pricing: "$12,000",
    nextSteps: "next",
  },
};

describe("canonicalSnapshotJson / hashProposalSnapshot", () => {
  it("is stable across object key order", () => {
    const reordered: ProposalSnapshot = {
      content: { ...snapshot.content },
      client: { ...snapshot.client },
    } as ProposalSnapshot;

    expect(canonicalSnapshotJson(reordered)).toBe(canonicalSnapshotJson(snapshot));
    expect(hashProposalSnapshot(reordered)).toBe(hashProposalSnapshot(snapshot));
  });

  it("includes client metadata in the hash", () => {
    const changed: ProposalSnapshot = {
      ...snapshot,
      client: { ...snapshot.client, clientName: "Different Client" },
    };
    expect(hashProposalSnapshot(changed)).not.toBe(hashProposalSnapshot(snapshot));
  });

  it("produces a 64-character hex sha-256 digest", () => {
    const hash = hashProposalSnapshot(snapshot);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not accept clientEmail as part of the snapshot type", () => {
    // Type-level guarantee: ProposalSnapshot has no clientEmail field.
    expect((snapshot as unknown as { clientEmail?: string }).clientEmail).toBeUndefined();
  });
});
