import { z } from "zod";

export const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/** A discovery call already happened, so its date can never be in the
 * future. Compared as plain ISO strings (YYYY-MM-DD sorts lexicographically
 * like a date) against the server's own UTC "today" — a coarser boundary
 * than the date input's own local-timezone `max` attribute, but that's fine
 * for a server-side backstop rather than the primary UX control. */
export function isNotFutureIsoDate(value: string): boolean {
  if (!isoDatePattern.test(value)) return true;
  return value <= new Date().toISOString().slice(0, 10);
}

const FUTURE_DATE_MESSAGE = "Date of Call cannot be in the future.";

export const proposalIntakeSchema = z.object({
  clientName: z.string().trim(),
  clientEmail: z.union([z.literal(""), z.string().trim().email()]),
  companyName: z.string().trim(),
  dateOfCall: z
    .union([z.literal(""), z.string().trim().regex(isoDatePattern)])
    .refine(isNotFutureIsoDate, { message: FUTURE_DATE_MESSAGE }),
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
    dateOfCall: z.string().trim().refine(isNotFutureIsoDate, { message: FUTURE_DATE_MESSAGE }),
    salespersonName: z.string().trim().min(1),
  }),
  content: proposalBodySchema,
});

export const clientEmailSchema = z.union([z.literal(""), z.string().trim().email()]);
