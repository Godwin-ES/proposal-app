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

  it("leaves a leading hyphen bullet alone — it's the one allowed list style", () => {
    const input = "- First point\n- Second point";
    expect(stripMarkdownFormatting(input)).toBe(input);
  });

  it("normalizes numbered and asterisk/bullet-dot markers to a hyphen instead of dropping them", () => {
    expect(stripMarkdownFormatting("1. First point\n2. Second point")).toBe("- First point\n- Second point");
    expect(stripMarkdownFormatting("* First point")).toBe("- First point");
    expect(stripMarkdownFormatting("• First point")).toBe("- First point");
  });

  it("strips markdown headings", () => {
    expect(stripMarkdownFormatting("## Overview\nSome text")).toBe("Overview\nSome text");
  });

  it("does not touch a mid-sentence hyphen or asterisk-free plain text", () => {
    const plain = "We recommend a phased rollout over 6-8 weeks, at a 10% discount.";
    expect(stripMarkdownFormatting(plain)).toBe(plain);
  });

  it("unwraps a bolded lead-in on a hyphen bullet while keeping the bullet", () => {
    const input = "- **Instructor lesson scheduling**: A scheduling interface enabling instructors to post available times.";
    expect(stripMarkdownFormatting(input)).toBe(
      "- Instructor lesson scheduling: A scheduling interface enabling instructors to post available times."
    );
  });

  it("keeps a realistic bulleted paragraph intact end to end", () => {
    const input = `The scope includes:

- **Instructor lesson scheduling**: A scheduling interface enabling instructors to post available times.
- **Parent self-service rescheduling**: A parent-facing portal allowing families to request reschedules.

The system will integrate lesson data automatically.`;

    expect(stripMarkdownFormatting(input)).toBe(`The scope includes:

- Instructor lesson scheduling: A scheduling interface enabling instructors to post available times.
- Parent self-service rescheduling: A parent-facing portal allowing families to request reschedules.

The system will integrate lesson data automatically.`);
  });
});
