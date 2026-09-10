import { z } from "zod";

export const materialUsageSchema = z.object({
  materialId: z.string().uuid(),
  sections: z
    .array(z.enum(["introduction", "projectScope", "recommendedApproach", "deliverables"]))
    .min(1),
  factUsed: z.string().trim().min(1),
});

/**
 * "general" stands in for "not tied to one section" (e.g. an uploaded file
 * that seems unrelated to this proposal entirely). A real `null` would work
 * for our own domain type, but Gemini's schema format has real trouble with
 * nullable/union JSON Schema shapes (the same class of incompatibility that
 * broke `const` on regeneration schemas) — a plain enum sidesteps that
 * entirely. `lib/domain/clarification.ts` maps "general" -> `null` when
 * building our internal ClarificationFlag.
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
