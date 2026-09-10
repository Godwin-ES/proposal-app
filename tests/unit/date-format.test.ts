import { describe, expect, it } from "vitest";
import { formatDateOfCall } from "@/lib/domain/date-format";

describe("formatDateOfCall", () => {
  it("formats an ISO date as DD-Mon-YYYY", () => {
    expect(formatDateOfCall("2026-02-03")).toBe("03-Feb-2026");
    expect(formatDateOfCall("2026-12-25")).toBe("25-Dec-2026");
    expect(formatDateOfCall("2026-01-01")).toBe("01-Jan-2026");
  });

  it("returns the input unchanged if it isn't a plain ISO date", () => {
    expect(formatDateOfCall("")).toBe("");
    expect(formatDateOfCall("not-a-date")).toBe("not-a-date");
  });
});
