import { createHash } from "node:crypto";
import type { ProposalSnapshot } from "@/lib/domain/types";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

export function canonicalSnapshotJson(snapshot: ProposalSnapshot): string {
  return JSON.stringify(canonicalize(snapshot));
}

export function hashProposalSnapshot(snapshot: ProposalSnapshot): string {
  return createHash("sha256").update(canonicalSnapshotJson(snapshot)).digest("hex");
}
