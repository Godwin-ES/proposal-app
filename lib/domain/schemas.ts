import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const proposalIntakeSchema = z.object({
  clientName: z.string().trim(),
  clientEmail: z.union([z.literal(""), z.string().trim().email()]),
  companyName: z.string().trim(),
  dateOfCall: z.union([z.literal(""), z.string().trim().regex(isoDatePattern)]),
  salespersonName: z.string().trim(),
  clientNeedsSummary: z.string().trim(),
  projectScope: z.string().trim(),
  goalsAndObjectives: z.string().trim(),
  recommendedServices: z.string().trim(),
  proposedTimeline: z.string().trim(),
  estimatedPricing: z.string().trim(),
});

export const proposalBodySchema = z.object({
  introduction: z.string().trim().min(1),
  projectScope: z.string().trim().min(1),
  recommendedApproach: z.string().trim().min(1),
  deliverables: z.array(z.string().trim().min(1)).min(1),
  timeline: z.string().trim().min(1),
  pricing: z.string().trim().min(1),
  nextSteps: z.string().trim().min(1),
});

export const proposalSnapshotSchema = z.object({
  client: z.object({
    clientName: z.string().trim().min(1),
    companyName: z.string().trim().min(1),
    dateOfCall: z.string().trim(),
    salespersonName: z.string().trim().min(1),
  }),
  content: proposalBodySchema,
});

export const clientEmailSchema = z.union([z.literal(""), z.string().trim().email()]);
