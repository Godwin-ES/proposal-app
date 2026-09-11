"use client";

import { useTransition } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateIntakeAction, updateClientEmailAction, updateDocumentProvidesFieldsAction } from "@/actions/proposals";
import { proposalIntakeSchema } from "@/lib/domain/schemas";
import type { ProposalIntake } from "@/lib/domain/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineInput } from "@/components/shared/timeline-input";
import { PricingInput } from "@/components/shared/pricing-input";
import { formatTimeline, formatPricing } from "@/lib/domain/quantity-fields";
import { todayIsoDate } from "@/lib/domain/date-format";

type FieldConfig = {
  name: keyof ProposalIntake;
  label: string;
  multiline?: boolean;
  required?: boolean;
  kind?: "timeline" | "pricing";
  inputType?: string;
};

/** ProposalIntake plus the one non-intake toggle this form also saves. Kept
 * local to this component (not part of the shared ProposalIntake domain
 * type) since it's a generation-behavior flag, not proposal content.
 * `proposalIntakeSchema` alone would strip this extra key during
 * validation (zod objects default to "strip" on unknown keys), so it's
 * extended here rather than reused as-is. */
const intakeFormSchema = proposalIntakeSchema.extend({ documentProvidesFields: z.boolean() });
type IntakeFormValues = ProposalIntake & { documentProvidesFields: boolean };

const CLIENT_INFO_FIELDS: FieldConfig[] = [
  { name: "clientName", label: "Client Name", required: true },
  { name: "companyName", label: "Company Name", required: true },
  { name: "dateOfCall", label: "Date of Call", required: true, inputType: "date" },
  { name: "salespersonName", label: "Salesperson Name", required: true },
  { name: "clientEmail", label: "Client Email (delivery address)", inputType: "email" },
];

/** Fields evaluateGenerationReadiness stops requiring when
 * documentProvidesFields is checked — kept in sync with that function. */
const RELAXABLE_FIELDS = new Set<keyof ProposalIntake>([
  "clientName",
  "companyName",
  "salespersonName",
  "dateOfCall",
  "clientNeedsSummary",
  "projectScope",
  "goalsAndObjectives",
  "recommendedServices",
]);

const SECTIONS: { title: string; fields: FieldConfig[] }[] = [
  {
    title: "Discovery & Business Needs",
    fields: [
      { name: "clientNeedsSummary", label: "Summary of Client's Needs", multiline: true, required: true },
      { name: "goalsAndObjectives", label: "Goals and Objectives", multiline: true, required: true },
    ],
  },
  {
    title: "Proposed Engagement",
    fields: [
      { name: "projectScope", label: "Project Scope", multiline: true, required: true },
      { name: "recommendedServices", label: "Recommended Services / Deliverables", multiline: true, required: true },
    ],
  },
  {
    title: "Commercial Details",
    fields: [
      { name: "proposedTimeline", label: "Proposed Timeline", required: true, kind: "timeline" },
      { name: "estimatedPricing", label: "Estimated Pricing", required: true, kind: "pricing" },
    ],
  },
];

export function IntakeForm({
  proposalId,
  defaultValues,
  documentProvidesFields,
  editable,
}: {
  proposalId: string;
  defaultValues: ProposalIntake;
  /** Whether the salesperson has declared supporting material already
   * contains some of these fields — relaxes which ones are required before
   * generating (see evaluateGenerationReadiness) and lets generation draw
   * blank ones from that material instead (see composeInitialSnapshot). */
  documentProvidesFields: boolean;
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
    // TimelineInput/PricingInput always *display* a real default (1 week /
    // $0) even when the underlying field is blank, so the form's actual
    // default must match that display from the first render — otherwise the
    // displayed value and the saved value silently disagree until the user
    // happens to touch the stepper.
    defaultValues: {
      ...defaultValues,
      proposedTimeline: defaultValues.proposedTimeline || formatTimeline(1, "weeks"),
      estimatedPricing: defaultValues.estimatedPricing || formatPricing(1, "USD"),
      documentProvidesFields,
    },
  });

  const documentProvidesFieldsValue = useWatch({ control, name: "documentProvidesFields" });

  function onSubmit(values: IntakeFormValues) {
    const { documentProvidesFields: fieldsFlag, ...intake } = values;
    startTransition(async () => {
      // Client Email and the "document provides fields" flag are each saved
      // through their own RPC internally (neither is versioned proposal
      // content) — but from the user's perspective, one "Save Intake" click
      // saves everything on this form.
      const [intakeResult, emailResult, fieldsFlagResult] = await Promise.all([
        updateIntakeAction(proposalId, intake),
        updateClientEmailAction(proposalId, intake.clientEmail),
        updateDocumentProvidesFieldsAction(proposalId, fieldsFlag),
      ]);
      const failures = [
        !intakeResult.ok ? intakeResult.error.message : null,
        !emailResult.ok ? `client email: ${emailResult.error.message}` : null,
        !fieldsFlagResult.ok ? `document-provides-fields: ${fieldsFlagResult.error.message}` : null,
      ].filter((m): m is string => m !== null);

      if (failures.length === 0) {
        toast.success("Intake saved.");
      } else if (failures.length === 1 && !intakeResult.ok) {
        toast.error(failures[0]);
      } else {
        toast.error(`Some of the intake failed to save: ${failures.join("; ")}`);
      }
    });
  }

  function renderField(field: FieldConfig) {
    const stillRequired = field.required && !(documentProvidesFieldsValue && RELAXABLE_FIELDS.has(field.name));
    return (
      <div key={field.name} className={field.multiline ? "sm:col-span-2 flex flex-col gap-2" : "flex flex-col gap-2"}>
        <Label htmlFor={field.name}>
          {field.label}
          {stillRequired ? <span className="text-destructive"> *</span> : null}
        </Label>
        {field.kind === "timeline" || field.kind === "pricing" ? (
          <Controller
            name={field.name}
            control={control}
            render={({ field: { value, onChange } }) =>
              field.kind === "timeline" ? (
                <TimelineInput value={value as string} onChange={onChange} disabled={!editable || pending} />
              ) : (
                <PricingInput value={value as string} onChange={onChange} disabled={!editable || pending} />
              )
            }
          />
        ) : field.multiline ? (
          <Textarea id={field.name} disabled={!editable || pending} rows={4} {...register(field.name)} />
        ) : (
          <Input
            id={field.name}
            type={field.inputType}
            max={field.inputType === "date" ? todayIsoDate() : undefined}
            disabled={!editable || pending}
            {...register(field.name)}
          />
        )}
        {errors[field.name] ? <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">{CLIENT_INFO_FIELDS.map(renderField)}</div>
          </CardContent>
        </Card>

        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">{section.fields.map(renderField)}</CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <Label className="flex items-start gap-2 font-normal">
              <Controller
                name="documentProvidesFields"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Checkbox checked={value} onCheckedChange={onChange} disabled={!editable || pending} />
                )}
              />
              <span>A supporting document already has these fields</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Blank fields — and Timeline/Pricing left at their default — are filled from supporting material where
              possible when you generate; the AI flags anything it can&apos;t confidently fill in, rather than
              guessing, and never overwrites a value you actually entered yourself.
            </p>
          </CardContent>
        </Card>

        {editable ? (
          <div>
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? "Saving..." : "Save Intake"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This proposal already has a generated version. Use the Proposal Workspace below to make client-facing
            revisions.
          </p>
        )}
      </form>
    </div>
  );
}
