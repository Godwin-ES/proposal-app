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
  sourcesUsed: string[];
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
  if (!current) return { sourcesUsed: [], sections: [] };

  const byVersionNumberDesc = [...versions]
    .filter((v) => v.versionNumber <= current.versionNumber)
    .sort((a, b) => b.versionNumber - a.versionNumber);

  const runByOutputVersionId = new Map(generationRuns.map((r) => [r.outputVersionId, r]));
  const filenameById = new Map(materials.map((m) => [m.id, m.filename]));

  function filenamesFor(versionId: string, section: ProposalSectionKey): string[] {
    const run = runByOutputVersionId.get(versionId);
    if (!run) return [];
    const names = run.materialUsage
      .filter((u) => u.sections.includes(section))
      .map((u) => filenameById.get(u.materialId))
      .filter((f): f is string => Boolean(f));
    return Array.from(new Set(names));
  }

  const sections: ReviewContextSection[] = AI_SECTIONS.map((section) => {
    for (const v of byVersionNumberDesc) {
      if (v.changeType === "initial_generation") {
        const filenames = filenamesFor(v.id, section);
        return { section, grounded: filenames.length > 0, filenames };
      }
      if (v.changedSections.includes(section)) {
        if (v.changeType === "manual_edit") {
          return { section, grounded: false, filenames: [] };
        }
        const filenames = filenamesFor(v.id, section);
        return { section, grounded: filenames.length > 0, filenames };
      }
    }
    return { section, grounded: false, filenames: [] };
  });

  const sourcesUsed = Array.from(new Set(sections.flatMap((s) => s.filenames)));
  return { sourcesUsed, sections };
}
