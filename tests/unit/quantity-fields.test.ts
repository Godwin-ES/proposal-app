import { describe, expect, it } from "vitest";
import { formatPricing, formatTimeline, parsePricing, parseTimeline } from "@/lib/domain/quantity-fields";

describe("formatTimeline / parseTimeline", () => {
  it("formats plural units", () => {
    expect(formatTimeline(6, "weeks")).toBe("6 weeks");
    expect(formatTimeline(3, "months")).toBe("3 months");
  });

  it("formats singular units for an amount of exactly 1", () => {
    expect(formatTimeline(1, "weeks")).toBe("1 week");
    expect(formatTimeline(1, "days")).toBe("1 day");
  });

  it("parses a formatted timeline back into amount and unit", () => {
    expect(parseTimeline("6 weeks")).toEqual({ amount: 6, unit: "weeks" });
    expect(parseTimeline("1 week")).toEqual({ amount: 1, unit: "weeks" });
  });

  it("normalizes common unit aliases", () => {
    expect(parseTimeline("45 mins")).toEqual({ amount: 45, unit: "minutes" });
    expect(parseTimeline("2 hrs")).toEqual({ amount: 2, unit: "hours" });
  });

  it("falls back to a sane default for unparseable input", () => {
    expect(parseTimeline("")).toEqual({ amount: 1, unit: "weeks" });
    expect(parseTimeline("sometime soon")).toEqual({ amount: 1, unit: "weeks" });
  });

  it("round-trips format -> parse -> format", () => {
    const formatted = formatTimeline(8, "weeks");
    const parsed = parseTimeline(formatted);
    expect(formatTimeline(parsed.amount, parsed.unit)).toBe(formatted);
  });
});

describe("formatPricing / parsePricing", () => {
  it("formats with a dollar sign and thousands separators", () => {
    expect(formatPricing(14500)).toBe("$14,500");
    expect(formatPricing(0)).toBe("$0");
  });

  it("parses a formatted price back into a number", () => {
    expect(parsePricing("$14,500")).toBe(14500);
  });

  it("falls back to 0 for unparseable input", () => {
    expect(parsePricing("")).toBe(0);
    expect(parsePricing("call for pricing")).toBe(0);
  });

  it("round-trips format -> parse -> format", () => {
    const formatted = formatPricing(23000);
    expect(formatPricing(parsePricing(formatted))).toBe(formatted);
  });
});
