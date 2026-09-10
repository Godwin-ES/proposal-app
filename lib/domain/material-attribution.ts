import type { ProposalChangeType, ProposalSectionKey } from "@/lib/domain/types";

const AI_SECTIONS: ProposalSectionKey[] = ["introduction", "projectScope", "recommendedApproach", "deliverables"];

export type ReviewContextVersionMeta = {
  id: string;
  versionNumber: number;
  changeType: ProposalChangeType;
  changedSections: string[];
};

export type ReviewContextGenerationRun = {
  outputVersionId: string;
  materialUsage: { materialId: string; sections: string[]; factUsed: string }[];
};

export type ReviewContextMaterial = { id: string; filename: string };

export type ReviewContextSection = {
  section: ProposalSectionKey;
  grounded: boolean;
  filenames: string[];
};

export type ReviewContext = {
  /** Every material ever uploaded to this proposal — not filtered to only
   * ones actually cited. Whether a given one currently grounds anything is
   * conveyed by `sections` instead, so the Approver can see the full set of
   * material Sales considered (including one the AI flagged as irrelevant
   * and correctly never cited) rather than only the subset that "worked". */
  materials: ReviewContextMaterial[];
  sections: ReviewContextSection[];
};

/**
 * For each AI-authored section, walks the version chronology backward from
 * the version under review to find whichever change last determined that
 * section's current content — a manual edit (not AI-grounded), a section
 * regeneration or the initial generation (AI-grounded, attributed to
 * whichever supporting materials that run's `materialUsage` cites for that
 * section). A section a given version didn't touch carries forward from an
 * earlier version, so the walk continues until it finds the version that
 * actually produced the current text.
 */
export function computeReviewContext(
  currentVersionId: string,
  versions: ReviewContextVersionMeta[],
  generationRuns: ReviewContextGenerationRun[],
  materials: ReviewContextMaterial[]
): ReviewContext {
  const current = versions.find((v) => v.id === currentVersionId);
  if (!current) return { materials: [], sections: [] };

  const byVersionNumberDesc = [...versions]
    .filter((v) => v.versionNumber <= current.versionNumber)
    .sort((a, b) => b.versionNumber - a.versionNumber);

  const runByOutputVersionId = new Map(generationRuns.map((r) => [r.outputVersionId, r]));
  const materialById = new Map(materials.map((m) => [m.id, m]));

  function materialsFor(versionId: string, section: ProposalSectionKey): ReviewContextMaterial[] {
    const run = runByOutputVersionId.get(versionId);
    if (!run) return [];
    const cited = run.materialUsage
      .filter((u) => u.sections.includes(section))
      .map((u) => materialById.get(u.materialId))
      .filter((m): m is ReviewContextMaterial => Boolean(m));
    return Array.from(new Map(cited.map((m) => [m.id, m])).values());
  }

  /** Which materials (if any) currently ground this section — empty if the
   * section's last determining change was a manual edit, or cites nothing. */
  function citedMaterialsForSection(section: ProposalSectionKey): ReviewContextMaterial[] {
    for (const v of byVersionNumberDesc) {
      if (v.changeType === "initial_generation") return materialsFor(v.id, section);
      if (v.changedSections.includes(section)) {
        return v.changeType === "manual_edit" ? [] : materialsFor(v.id, section);
      }
    }
    return [];
  }

  const citedBySection = AI_SECTIONS.map((section) => ({ section, cited: citedMaterialsForSection(section) }));

  const sections: ReviewContextSection[] = citedBySection.map(({ section, cited }) => ({
    section,
    grounded: cited.length > 0,
    filenames: cited.map((m) => m.filename),
  }));

  return { materials, sections };
}
