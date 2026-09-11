import { describe, expect, it } from "vitest";
import { generatedSectionsSchema, sectionRegenerationSchema } from "@/lib/ai/schemas";

describe("generatedSectionsSchema", () => {
  const valid = {
    introduction: "intro",
    projectScope: "scope",
    recommendedApproach: "approach",
    deliverables: ["one"],
    fieldsFromMaterial: {
      clientName: null,
      companyName: null,
      clientEmail: null,
      salespersonName: null,
      dateOfCall: null,
      timeline: null,
      pricing: null,
    },
  };

  it("accepts a valid provider payload and defaults optional arrays", () => {
    const result = generatedSectionsSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clarificationFlags).toEqual([]);
      expect(result.data.supportingMaterialUsage).toEqual([]);
    }
  });

  it("rejects a missing fieldsFromMaterial (it must always be present, even all-null)", () => {
    const withoutFields: Record<string, unknown> = { ...valid };
    delete withoutFields.fieldsFromMaterial;
    expect(generatedSectionsSchema.safeParse(withoutFields).success).toBe(false);
  });

  it("accepts filled-in fieldsFromMaterial values", () => {
    const result = generatedSectionsSchema.safeParse({
      ...valid,
      fieldsFromMaterial: {
        clientName: "Jane Doe",
        companyName: "Acme Co",
        clientEmail: "jane@acme.test",
        salespersonName: "Sam Rep",
        dateOfCall: "2026-01-15",
        timeline: { amount: 6, unit: "weeks" },
        pricing: { amount: 12000, currency: "USD" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid timeline unit in fieldsFromMaterial", () => {
    const result = generatedSectionsSchema.safeParse({
      ...valid,
      fieldsFromMaterial: { ...valid.fieldsFromMaterial, timeline: { amount: 6, unit: "fortnights" } },
    });
    expect(result.success).toBe(false);
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
