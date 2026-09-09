import { describe, expect, it } from "vitest";
import { z } from "zod";
import { sanitizeForGemini } from "@/lib/ai/gemini";
import { toProviderJsonSchema } from "@/lib/ai/json-schema";
import { introductionRegenerationSchema } from "@/lib/ai/schemas";

describe("sanitizeForGemini", () => {
  it("rewrites a top-level const into a single-value enum", () => {
    const input = { type: "string", const: "introduction" };
    expect(sanitizeForGemini(input)).toEqual({ type: "string", enum: ["introduction"] });
  });

  it("rewrites const nested inside object properties and arrays", () => {
    const input = {
      type: "object",
      properties: {
        section: { type: "string", const: "deliverables" },
        items: { type: "array", items: [{ const: 1 }, { const: 2 }] },
      },
    };
    expect(sanitizeForGemini(input)).toEqual({
      type: "object",
      properties: {
        section: { type: "string", enum: ["deliverables"] },
        items: { type: "array", items: [{ enum: [1] }, { enum: [2] }] },
      },
    });
  });

  it("leaves schemas with no const untouched", () => {
    const input = { type: "string", minLength: 1 };
    expect(sanitizeForGemini(input)).toEqual(input);
  });

  it("produces a schema with no `const` anywhere for the real regeneration schema (z.literal discriminator)", () => {
    const rawSchema = toProviderJsonSchema(introductionRegenerationSchema);
    // z.literal("introduction") is exactly what produced Gemini's real error:
    // "Unknown name \"const\"... Cannot find field."
    expect(JSON.stringify(rawSchema)).toContain('"const"');

    const sanitized = sanitizeForGemini(rawSchema);
    expect(JSON.stringify(sanitized)).not.toContain('"const"');
    expect((sanitized as { properties: { section: { enum: string[] } } }).properties.section.enum).toEqual([
      "introduction",
    ]);
  });
});

// Guards against the schema helper's output shape drifting in a way that
// would silently stop needing sanitization (or start needing more of it).
describe("toProviderJsonSchema + z.literal (regression context)", () => {
  it("still emits `const` for a literal field, confirming the Gemini incompatibility this fix targets", () => {
    const schema = z.object({ kind: z.literal("x") });
    const json = toProviderJsonSchema(schema) as { properties: { kind: { const: string } } };
    expect(json.properties.kind.const).toBe("x");
  });
});
