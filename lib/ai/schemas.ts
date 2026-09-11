import { z } from "zod";
import { TIMELINE_UNITS, CURRENCY_CODES } from "@/lib/domain/quantity-fields";

/**
 * Fill-only-if-blank values the model may offer for structural fields it
 * otherwise never touches, drawn from supporting material — only used when
 * the salesperson has declared (`documentProvidesFields`) that a document
 * contains this information. Every key is nullable and independent: the
 * model reports `null` for anything it can't find, and — critically —
 * `composeInitialSnapshot` only ever consults these when the corresponding
 * intake field was actually left at its default/blank; a value here can
 * never override something the salesperson typed themselves. A contradiction
 * with a value the salesperson DID provide is reported as a clarificationFlag
 * instead of through this object.
 */
export const fieldsFromMaterialSchema = z.object({
  clientName: z.string().trim().min(1).nullable(),
  companyName: z.string().trim().min(1).nullable(),
  timeline: z
    .object({
      amount: z.number().int().positive(),
      unit: z.enum(TIMELINE_UNITS),
    })
    .nullable(),
  pricing: z
    .object({
      amount: z.number().positive(),
      currency: z.enum(CURRENCY_CODES),
    })
    .nullable(),
});
export type FieldsFromMaterial = z.infer<typeof fieldsFromMaterialSchema>;

export const materialUsageSchema = z.object({
  materialId: z.string().uuid(),
  sections: z
    .array(z.enum(["introduction", "projectScope", "recommendedApproach", "deliverables"]))
    .min(1),
  factUsed: z.string().trim().min(1),
});

/**
 * "general" stands in for "not tied to one section" (e.g. an uploaded file
 * that seems unrelated to this proposal entirely) — a plain enum value
 * rather than a real `null`/union JSON Schema shape, kept simple rather than
 * reworked now that it no longer needs to satisfy anything beyond
 * Anthropic's tool schema. `lib/domain/clarification.ts` maps "general" ->
 * `null` when building our internal ClarificationFlag.
 */
export const clarificationFlagSchema = z.object({
  section: z.enum(["introduction", "projectScope", "recommendedApproach", "deliverables", "general"]),
  message: z.string().trim().min(1),
});
export type AIClarificationFlag = z.infer<typeof clarificationFlagSchema>;

export const generatedSectionsSchema = z.object({
  introduction: z.string().trim().min(1),
  projectScope: z.string().trim().min(1),
  recommendedApproach: z.string().trim().min(1),
  deliverables: z.array(z.string().trim().min(1)).min(1),
  clarificationFlags: z.array(clarificationFlagSchema).default([]),
  supportingMaterialUsage: z.array(materialUsageSchema).default([]),
  fieldsFromMaterial: fieldsFromMaterialSchema,
});

export type GeneratedSections = z.infer<typeof generatedSectionsSchema>;
export type MaterialUsage = z.infer<typeof materialUsageSchema>;

export const introductionRegenerationSchema = z.object({
  section: z.literal("introduction"),
  content: z.string().trim().min(1),
  clarificationFlags: z.array(clarificationFlagSchema).default([]),
  supportingMaterialUsage: z.array(materialUsageSchema).default([]),
});

export const projectScopeRegenerationSchema = introductionRegenerationSchema.extend({
  section: z.literal("projectScope"),
});

export const recommendedApproachRegenerationSchema = introductionRegenerationSchema.extend({
  section: z.literal("recommendedApproach"),
});

export const deliverablesRegenerationSchema = z.object({
  section: z.literal("deliverables"),
  content: z.array(z.string().trim().min(1)).min(1),
  clarificationFlags: z.array(clarificationFlagSchema).default([]),
  supportingMaterialUsage: z.array(materialUsageSchema).default([]),
});

export const sectionRegenerationSchema = z.discriminatedUnion("section", [
  introductionRegenerationSchema,
  projectScopeRegenerationSchema,
  recommendedApproachRegenerationSchema,
  deliverablesRegenerationSchema,
]);

export type SectionRegenerationResult = z.infer<typeof sectionRegenerationSchema>;

/** One schema per section, keyed so a provider call can only ever target the
 * exact section the application requested — the model cannot choose a
 * different `section` value because the schema fixes it as a literal. */
export const REGENERATION_SCHEMA_BY_SECTION = {
  introduction: introductionRegenerationSchema,
  projectScope: projectScopeRegenerationSchema,
  recommendedApproach: recommendedApproachRegenerationSchema,
  deliverables: deliverablesRegenerationSchema,
} as const;
