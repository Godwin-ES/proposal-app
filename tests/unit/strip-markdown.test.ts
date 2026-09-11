import { describe, expect, it } from "vitest";
import { stripMarkdownFormatting } from "@/lib/domain/strip-markdown";

describe("stripMarkdownFormatting", () => {
  it("unwraps bold and italic markers", () => {
    expect(stripMarkdownFormatting("This is **bold** and this is *italic*.")).toBe(
      "This is bold and this is italic."
    );
    expect(stripMarkdownFormatting("This is __bold__ and this is _italic_.")).toBe(
      "This is bold and this is italic."
    );
  });

  it("strips numbered and bulleted list markers at the start of a line", () => {
    expect(stripMarkdownFormatting("1. First point\n2. Second point")).toBe("First point\nSecond point");
    expect(stripMarkdownFormatting("- First point\n- Second point")).toBe("First point\nSecond point");
    expect(stripMarkdownFormatting("* First point")).toBe("First point");
  });

  it("strips markdown headings", () => {
    expect(stripMarkdownFormatting("## Overview\nSome text")).toBe("Overview\nSome text");
  });

  it("does not touch a mid-sentence hyphen or asterisk-free plain text", () => {
    const plain = "We recommend a phased rollout over 6-8 weeks, at a 10% discount.";
    expect(stripMarkdownFormatting(plain)).toBe(plain);
  });

  it("handles a realistic deliverable line with a bolded lead-in", () => {
    const input = "- **Instructor lesson scheduling**: A scheduling interface enabling instructors to post available times.";
    expect(stripMarkdownFormatting(input)).toBe(
      "Instructor lesson scheduling: A scheduling interface enabling instructors to post available times."
    );
  });
});
