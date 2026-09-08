import { describe, expect, it } from "vitest";
import {
  assertEditableStatus,
  computeEditableStatus,
  isEditableStatus,
} from "@/lib/domain/state-machine";
import { ProposalStatusError } from "@/lib/domain/errors";

describe("state machine", () => {
  it("draft, needs_clarification, and changes_requested are editable", () => {
    expect(isEditableStatus("draft")).toBe(true);
    expect(isEditableStatus("needs_clarification")).toBe(true);
    expect(isEditableStatus("changes_requested")).toBe(true);
  });

  it("pending_approval is not editable", () => {
    expect(isEditableStatus("pending_approval")).toBe(false);
  });

  it("delivered is terminal and not editable", () => {
    expect(isEditableStatus("delivered")).toBe(false);
  });

  it("approved is not directly editable (must go through versioning)", () => {
    expect(isEditableStatus("approved")).toBe(false);
  });

  it("assertEditableStatus throws for pending_approval", () => {
    expect(() => assertEditableStatus("pending_approval")).toThrow(ProposalStatusError);
  });

  it("assertEditableStatus does not throw for draft", () => {
    expect(() => assertEditableStatus("draft")).not.toThrow();
  });

  it("computeEditableStatus returns needs_clarification when approval blockers or warnings exist", () => {
    expect(computeEditableStatus(["Estimated Pricing"], [])).toBe("needs_clarification");
    expect(computeEditableStatus([], ["Missing supporting detail"])).toBe("needs_clarification");
  });

  it("computeEditableStatus returns draft when fully clean", () => {
    expect(computeEditableStatus([], [])).toBe("draft");
  });
});
