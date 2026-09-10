import { describe, expect, it } from "vitest";
import { carryForwardClarificationFlags, openClarificationFlags, withFlagIds } from "@/lib/domain/clarification";
import type { ClarificationFlag } from "@/lib/domain/types";

describe("withFlagIds", () => {
  it("assigns a stable id and starts every flag as open", () => {
    const flags = withFlagIds([{ section: "projectScope", message: "No basis for this section." }]);
    expect(flags).toHaveLength(1);
    expect(flags[0].id).toBeTruthy();
    expect(flags[0].status).toBe("open");
    expect(flags[0].section).toBe("projectScope");
  });

  it("maps the AI's 'general' sentinel to a null section", () => {
    const flags = withFlagIds([{ section: "general", message: "This file seems unrelated." }]);
    expect(flags[0].section).toBeNull();
  });
});

describe("openClarificationFlags", () => {
  it("keeps only status: open", () => {
    const flags: ClarificationFlag[] = [
      { id: "1", section: null, message: "a", status: "open" },
      { id: "2", section: null, message: "b", status: "dismissed" },
      { id: "3", section: null, message: "c", status: "resolved" },
    ];
    expect(openClarificationFlags(flags)).toEqual([flags[0]]);
  });
});

describe("carryForwardClarificationFlags", () => {
  it("marks an open, section-tagged flag resolved once its section is touched", () => {
    const previous: ClarificationFlag[] = [
      { id: "1", section: "projectScope", message: "No basis.", status: "open" },
    ];
    const next = carryForwardClarificationFlags(previous, ["projectScope"]);
    expect(next).toEqual([{ id: "1", section: "projectScope", message: "No basis.", status: "resolved" }]);
  });

  it("never re-resolves a flag that was already dismissed or resolved", () => {
    const previous: ClarificationFlag[] = [
      { id: "1", section: "projectScope", message: "a", status: "dismissed" },
      { id: "2", section: "projectScope", message: "b", status: "resolved" },
    ];
    const next = carryForwardClarificationFlags(previous, ["projectScope"]);
    expect(next).toEqual(previous);
  });

  it("leaves a section-less flag untouched regardless of which sections changed", () => {
    const previous: ClarificationFlag[] = [
      { id: "1", section: null, message: "Unrelated upload.", status: "open" },
    ];
    const next = carryForwardClarificationFlags(previous, ["projectScope", "deliverables"]);
    expect(next).toEqual(previous);
  });

  it("leaves flags for other sections untouched", () => {
    const previous: ClarificationFlag[] = [
      { id: "1", section: "projectScope", message: "a", status: "open" },
      { id: "2", section: "deliverables", message: "b", status: "open" },
    ];
    const next = carryForwardClarificationFlags(previous, ["projectScope"]);
    expect(next.find((f) => f.id === "1")?.status).toBe("resolved");
    expect(next.find((f) => f.id === "2")?.status).toBe("open");
  });

  it("appends fresh flags alongside carried-forward history", () => {
    const previous: ClarificationFlag[] = [
      { id: "1", section: "projectScope", message: "old", status: "dismissed" },
    ];
    const fresh: ClarificationFlag[] = [{ id: "2", section: "deliverables", message: "new", status: "open" }];
    const next = carryForwardClarificationFlags(previous, ["deliverables"], fresh);
    expect(next).toEqual([...previous, ...fresh]);
  });
});
