import { describe, expect, it } from "vitest";
import {
  formatPricing,
  formatTimeline,
  parsePricing,
  parseTimeline,
  isTimelineUnset,
  isPricingUnset,
  TIMELINE_SAME_DAY,
  PRICING_NO_COST,
} from "@/lib/domain/quantity-fields";

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

  it("normalizes singular/plural unit spelling", () => {
    expect(parseTimeline("1 month")).toEqual({ amount: 1, unit: "months" });
    expect(parseTimeline("2 days")).toEqual({ amount: 2, unit: "days" });
  });

  it("falls back to the unset (0) sentinel for unparseable input", () => {
    expect(parseTimeline("")).toEqual({ amount: 0, unit: "weeks" });
    expect(parseTimeline("sometime soon")).toEqual({ amount: 0, unit: "weeks" });
  });

  it("round-trips format -> parse -> format", () => {
    const formatted = formatTimeline(8, "weeks");
    const parsed = parseTimeline(formatted);
    expect(formatTimeline(parsed.amount, parsed.unit)).toBe(formatted);
  });
});

describe("isTimelineUnset", () => {
  it("treats a 0-amount value as unset", () => {
    expect(isTimelineUnset(formatTimeline(0, "weeks"))).toBe(true);
    expect(isTimelineUnset("")).toBe(true);
    expect(isTimelineUnset("not a timeline")).toBe(true);
  });

  it("treats any non-zero amount as set", () => {
    expect(isTimelineUnset(formatTimeline(1, "weeks"))).toBe(false);
    expect(isTimelineUnset(formatTimeline(8, "weeks"))).toBe(false);
  });

  it("treats the deliberate Same day choice as set, not unset", () => {
    expect(isTimelineUnset(TIMELINE_SAME_DAY)).toBe(false);
  });
});

describe("formatPricing / parsePricing", () => {
  it("formats with a currency code and thousands separators", () => {
    expect(formatPricing(14500, "USD")).toBe("USD 14,500");
    expect(formatPricing(1, "EUR")).toBe("EUR 1");
  });

  it("parses a formatted price back into amount and currency", () => {
    expect(parsePricing("USD 14,500")).toEqual({ amount: 14500, currency: "USD" });
    expect(parsePricing("GBP 9,999")).toEqual({ amount: 9999, currency: "GBP" });
  });

  it("parses legacy $-prefixed values (from before currency selection existed), defaulting to USD", () => {
    expect(parsePricing("$14,500")).toEqual({ amount: 14500, currency: "USD" });
  });

  it("falls back to 0/USD for unparseable input", () => {
    expect(parsePricing("")).toEqual({ amount: 0, currency: "USD" });
    expect(parsePricing("call for pricing")).toEqual({ amount: 0, currency: "USD" });
  });

  it("round-trips format -> parse -> format", () => {
    const formatted = formatPricing(23000, "CAD");
    const parsed = parsePricing(formatted);
    expect(formatPricing(parsed.amount, parsed.currency)).toBe(formatted);
  });
});

describe("isPricingUnset", () => {
  it("treats a 0-amount value as unset", () => {
    expect(isPricingUnset(formatPricing(0, "USD"))).toBe(true);
    expect(isPricingUnset("")).toBe(true);
    expect(isPricingUnset("call for pricing")).toBe(true);
  });

  it("treats any non-zero amount as set", () => {
    expect(isPricingUnset(formatPricing(1, "USD"))).toBe(false);
    expect(isPricingUnset(formatPricing(18500, "USD"))).toBe(false);
  });

  it("treats the deliberate No cost choice as set, not unset", () => {
    expect(isPricingUnset(PRICING_NO_COST)).toBe(false);
  });
});
