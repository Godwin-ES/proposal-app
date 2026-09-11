import type { ProposalIntake, ProposalSectionKey, ProposalSnapshot } from "@/lib/domain/types";
import type { AIClarificationFlag, GeneratedSections } from "@/lib/ai/schemas";
import { buildNextSteps } from "@/lib/templates/proposal";
import { placeholderContent, SECTION_DISPLAY_LABELS } from "@/lib/domain/section-labels";
import { formatTimeline, formatPricing } from "@/lib/domain/quantity-fields";
import { stripMarkdownFormatting } from "@/lib/domain/strip-markdown";
import { isoDatePattern, isNotFutureIsoDate } from "@/lib/domain/schemas";

const DEFAULT_TIMELINE = formatTimeline(1, "weeks");
const DEFAULT_PRICING = formatPricing(1, "USD");

const NARRATIVE_SECTIONS: { key: ProposalSectionKey; label: string }[] = [
  { key: "introduction", label: SECTION_DISPLAY_LABELS.introduction },
  { key: "projectScope", label: SECTION_DISPLAY_LABELS.projectScope },
  { key: "recommendedApproach", label: SECTION_DISPLAY_LABELS.recommendedApproach },
];

/** Resolves one identity/structural field (Client Name, Company Name) that
 * the AI never writes as prose: the salesperson's own value always wins if
 * present; a document-supplied value only ever fills a genuinely blank
 * field, and only when `documentProvidesFields` was declared; anything
 * still unresolved becomes an explicit placeholder plus a flag, rather than
 * silently shipping a blank client-facing field. */
function resolveIdentityField(
  label: string,
  intakeValue: string,
  fromMaterial: string | null,
  documentProvidesFields: boolean
): { value: string; flag: AIClarificationFlag | null } {
  const trimmed = intakeValue.trim();
  if (trimmed) return { value: trimmed, flag: null };

  if (documentProvidesFields && fromMaterial) {
    return { value: fromMaterial, flag: null };
  }

  return {
    value: placeholderContent(label),
    flag: { section: "general", message: `${label} could not be determined from the intake fields or supporting material.` },
  };
}

/** Same rule as resolveIdentityField, but a document-supplied value must
 * also be a real, non-future ISO date to be usable — a hallucinated or
 * future date from material is worth no more than nothing, so it falls
 * through to the same placeholder/flag outcome rather than shipping a
 * value that would later fail the "no future date" snapshot check outright. */
function resolveDateOfCall(
  intakeValue: string,
  fromMaterial: string | null,
  documentProvidesFields: boolean
): { value: string; flag: AIClarificationFlag | null } {
  const trimmed = intakeValue.trim();
  if (trimmed) return { value: trimmed, flag: null };

  const usable =
    documentProvidesFields && fromMaterial !== null && isoDatePattern.test(fromMaterial) && isNotFutureIsoDate(fromMaterial);
  if (usable) return { value: fromMaterial as string, flag: null };

  return {
    value: placeholderContent("Date of Call"),
    flag: { section: "general", message: "Date of Call could not be determined from the intake fields or supporting material." },
  };
}

/** Same fill-only-if-blank rule as identity fields, but Timeline/Pricing are
 * never truly "blank" in this app — TimelineInput/PricingInput always
 * display a concrete default (1 week / a minimal price) even when the
 * salesperson never touched them. Treat that exact untouched default as
 * "not really specified" ONLY when `documentProvidesFields` is on, so a
 * document may supply a real value; anything else the salesperson typed is
 * always authoritative and is never a "failure" state, so there's no
 * placeholder/flag case here — worst case, the untouched default stands. */
function resolveCommercialField<T extends { amount: number }>(
  intakeValue: string,
  defaultValue: string,
  fromMaterial: T | null,
  documentProvidesFields: boolean,
  format: (value: T) => string
): string {
  if (documentProvidesFields && intakeValue.trim() === defaultValue && fromMaterial) {
    return format(fromMaterial);
  }
  return intakeValue;
}

/**
 * Composes Version 1 from the pre-generation intake and validated AI output.
 * Client identity fields and Timeline/Pricing are resolved deterministically
 * here — never left to the AI's own prose — so a hostile/miscalibrated
 * provider response has nothing to overwrite them with beyond the narrow,
 * fill-only-if-blank `fieldsFromMaterial` contract. Returns any additional
 * clarification flags this resolution raised, to be merged with the AI's
 * own before either is given an id.
 */
export function composeInitialSnapshot(
  intake: ProposalIntake,
  generated: GeneratedSections,
  documentProvidesFields: boolean
): { snapshot: ProposalSnapshot; additionalFlags: AIClarificationFlag[] } {
  const additionalFlags: AIClarificationFlag[] = [];

  const clientName = resolveIdentityField(
    "Client Name",
    intake.clientName,
    generated.fieldsFromMaterial.clientName,
    documentProvidesFields
  );
  if (clientName.flag) additionalFlags.push(clientName.flag);

  const companyName = resolveIdentityField(
    "Company Name",
    intake.companyName,
    generated.fieldsFromMaterial.companyName,
    documentProvidesFields
  );
  if (companyName.flag) additionalFlags.push(companyName.flag);

  const salespersonName = resolveIdentityField(
    "Salesperson Name",
    intake.salespersonName,
    generated.fieldsFromMaterial.salespersonName,
    documentProvidesFields
  );
  if (salespersonName.flag) additionalFlags.push(salespersonName.flag);

  const dateOfCall = resolveDateOfCall(intake.dateOfCall, generated.fieldsFromMaterial.dateOfCall, documentProvidesFields);
  if (dateOfCall.flag) additionalFlags.push(dateOfCall.flag);

  const timeline = resolveCommercialField(
    intake.proposedTimeline,
    DEFAULT_TIMELINE,
    generated.fieldsFromMaterial.timeline,
    documentProvidesFields,
    (t) => formatTimeline(t.amount, t.unit)
  );

  const pricing = resolveCommercialField(
    intake.estimatedPricing,
    DEFAULT_PRICING,
    generated.fieldsFromMaterial.pricing,
    documentProvidesFields,
    (p) => formatPricing(p.amount, p.currency)
  );

  // Safety net: if the model wrote the literal placeholder for a narrative
  // section but didn't (for whatever reason) also raise a flag naming that
  // section, guarantee one exists anyway — a placeholder with no
  // explanation is worse than a placeholder with one, and this must not
  // depend solely on the model remembering to self-report.
  const existingFlagSections = new Set(generated.clarificationFlags.map((f) => f.section));
  for (const { key, label } of NARRATIVE_SECTIONS) {
    if (generated[key] === placeholderContent(label) && !existingFlagSections.has(key)) {
      additionalFlags.push({ section: key, message: `${label} could not be grounded in the provided information and was left as a placeholder.` });
    }
  }
  const deliverablesPlaceholder = placeholderContent(SECTION_DISPLAY_LABELS.deliverables);
  if (
    generated.deliverables.length === 1 &&
    generated.deliverables[0] === deliverablesPlaceholder &&
    !existingFlagSections.has("deliverables")
  ) {
    additionalFlags.push({
      section: "deliverables",
      message: "Deliverables could not be grounded in the provided information and was left as a placeholder.",
    });
  }

  return {
    snapshot: {
      client: {
        clientName: clientName.value,
        companyName: companyName.value,
        dateOfCall: dateOfCall.value,
        salespersonName: salespersonName.value,
      },
      content: {
        introduction: stripMarkdownFormatting(generated.introduction),
        projectScope: stripMarkdownFormatting(generated.projectScope),
        recommendedApproach: stripMarkdownFormatting(generated.recommendedApproach),
        deliverables: generated.deliverables.map(stripMarkdownFormatting),
        timeline,
        pricing,
        nextSteps: buildNextSteps(),
      },
    },
    additionalFlags,
  };
}

type TargetContent<K extends ProposalSectionKey> = K extends "deliverables" ? string[] : string;

/**
 * Replaces only the targeted section of the current snapshot. Every other
 * client-facing field (including client metadata, timeline, and pricing)
 * is carried over unchanged so a targeted regeneration can never revert a
 * manually corrected value.
 */
export function composeRegeneratedSnapshot<K extends ProposalSectionKey>(
  currentSnapshot: ProposalSnapshot,
  target: K,
  newContent: TargetContent<K>
): ProposalSnapshot {
  const stripped = (Array.isArray(newContent) ? newContent.map(stripMarkdownFormatting) : stripMarkdownFormatting(newContent)) as TargetContent<K>;

  return {
    client: { ...currentSnapshot.client },
    content: {
      ...currentSnapshot.content,
      [target]: stripped,
    },
  };
}
