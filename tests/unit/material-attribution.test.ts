import { describe, expect, it } from "vitest";
import { computeReviewContext, type ReviewContextVersionMeta } from "@/lib/domain/material-attribution";

const MATERIALS = [{ id: "mat-1", filename: "discovery-notes.pdf" }];

describe("computeReviewContext", () => {
  it("attributes every section to the initial generation run when nothing was edited since", () => {
    const versions: ReviewContextVersionMeta[] = [
      { id: "v1", versionNumber: 1, changeType: "initial_generation", changedSections: [] },
    ];
    const generationRuns = [
      {
        outputVersionId: "v1",
        materialUsage: [{ materialId: "mat-1", sections: ["projectScope", "deliverables"], factUsed: "11 attorneys" }],
      },
    ];

    const context = computeReviewContext("v1", versions, generationRuns, MATERIALS);

    expect(context.sourcesUsed).toEqual(["discovery-notes.pdf"]);
    const scope = context.sections.find((s) => s.section === "projectScope")!;
    expect(scope.grounded).toBe(true);
    expect(scope.filenames).toEqual(["discovery-notes.pdf"]);
    const intro = context.sections.find((s) => s.section === "introduction")!;
    expect(intro.grounded).toBe(false);
  });

  it("marks a section not grounded once a manual edit overwrites it, but leaves other sections attributed", () => {
    const versions: ReviewContextVersionMeta[] = [
      { id: "v1", versionNumber: 1, changeType: "initial_generation", changedSections: [] },
      { id: "v2", versionNumber: 2, changeType: "manual_edit", changedSections: ["projectScope"] },
    ];
    const generationRuns = [
      {
        outputVersionId: "v1",
        materialUsage: [{ materialId: "mat-1", sections: ["projectScope", "deliverables"], factUsed: "11 attorneys" }],
      },
    ];

    const context = computeReviewContext("v2", versions, generationRuns, MATERIALS);

    const scope = context.sections.find((s) => s.section === "projectScope")!;
    expect(scope.grounded).toBe(false);
    const deliverables = context.sections.find((s) => s.section === "deliverables")!;
    expect(deliverables.grounded).toBe(true);
  });

  it("attributes a section to whichever regeneration run most recently touched it", () => {
    const versions: ReviewContextVersionMeta[] = [
      { id: "v1", versionNumber: 1, changeType: "initial_generation", changedSections: [] },
      { id: "v2", versionNumber: 2, changeType: "section_regeneration", changedSections: ["projectScope"] },
    ];
    const generationRuns = [
      { outputVersionId: "v1", materialUsage: [{ materialId: "mat-1", sections: ["projectScope"], factUsed: "old fact" }] },
      { outputVersionId: "v2", materialUsage: [] },
    ];

    const context = computeReviewContext("v2", versions, generationRuns, MATERIALS);

    const scope = context.sections.find((s) => s.section === "projectScope")!;
    expect(scope.grounded).toBe(false);
    expect(scope.filenames).toEqual([]);
  });

  it("returns nothing grounded when the current version isn't in the given version list", () => {
    const context = computeReviewContext("missing", [], [], MATERIALS);
    expect(context).toEqual({ sourcesUsed: [], sections: [] });
  });
});
