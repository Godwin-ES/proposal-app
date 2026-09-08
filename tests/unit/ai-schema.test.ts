import { describe, expect, it } from "vitest";
import { generatedSectionsSchema, sectionRegenerationSchema } from "@/lib/ai/schemas";

describe("generatedSectionsSchema", () => {
  const valid = {
    introduction: "intro",
    projectScope: "scope",
    recommendedApproach: "approach",
    deliverables: ["one"],
  };

  it("accepts a valid provider payload and defaults optional arrays", () => {
    const result = generatedSectionsSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clarificationFlags).toEqual([]);
      expect(result.data.supportingMaterialUsage).toEqual([]);
    }
  });

  it("rejects empty deliverables", () => {
    expect(generatedSectionsSchema.safeParse({ ...valid, deliverables: [] }).success).toBe(false);
  });

  it("has no pricing/timeline/client fields in the contract", () => {
    const parsed = generatedSectionsSchema.parse(valid);
    expect((parsed as Record<string, unknown>).pricing).toBeUndefined();
    expect((parsed as Record<string, unknown>).timeline).toBeUndefined();
    expect((parsed as Record<string, unknown>).clientName).toBeUndefined();
  });

  it("rejects an invalid material usage id", () => {
    const result = generatedSectionsSchema.safeParse({
      ...valid,
      supportingMaterialUsage: [{ materialId: "not-a-uuid", sections: ["introduction"], factUsed: "x" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("sectionRegenerationSchema", () => {
  it("accepts a targeted deliverables regeneration", () => {
    const result = sectionRegenerationSchema.safeParse({
      section: "deliverables",
      content: ["a", "b"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a target section the application did not request via the discriminant", () => {
    const result = sectionRegenerationSchema.safeParse({
      section: "pricing",
      content: "hacked",
    });
    expect(result.success).toBe(false);
  });
});
