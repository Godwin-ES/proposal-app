import { z } from "zod";

export const materialUsageSchema = z.object({
  materialId: z.string().uuid(),
  sections: z
    .array(z.enum(["introduction", "projectScope", "recommendedApproach", "deliverables"]))
    .min(1),
  factUsed: z.string().trim().min(1),
});

export const generatedSectionsSchema = z.object({
  introduction: z.string().trim().min(1),
  projectScope: z.string().trim().min(1),
  recommendedApproach: z.string().trim().min(1),
  deliverables: z.array(z.string().trim().min(1)).min(1),
  clarificationFlags: z.array(z.string().trim().min(1)).default([]),
  supportingMaterialUsage: z.array(materialUsageSchema).default([]),
});

export type GeneratedSections = z.infer<typeof generatedSectionsSchema>;
export type MaterialUsage = z.infer<typeof materialUsageSchema>;

export const introductionRegenerationSchema = z.object({
  section: z.literal("introduction"),
  content: z.string().trim().min(1),
  clarificationFlags: z.array(z.string().trim().min(1)).default([]),
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
  clarificationFlags: z.array(z.string().trim().min(1)).default([]),
  supportingMaterialUsage: z.array(materialUsageSchema).default([]),
});

export const sectionRegenerationSchema = z.discriminatedUnion("section", [
  introductionRegenerationSchema,
  projectScopeRegenerationSchema,
  recommendedApproachRegenerationSchema,
  deliverablesRegenerationSchema,
]);

export type SectionRegenerationResult = z.infer<typeof sectionRegenerationSchema>;
