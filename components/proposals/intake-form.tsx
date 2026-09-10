"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateIntakeAction, updateClientEmailAction } from "@/actions/proposals";
import { proposalIntakeSchema } from "@/lib/domain/schemas";
import type { ProposalIntake } from "@/lib/domain/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineInput } from "@/components/shared/timeline-input";
import { PricingInput } from "@/components/shared/pricing-input";
import { formatTimeline, formatPricing } from "@/lib/domain/quantity-fields";

type FieldConfig = {
  name: keyof ProposalIntake;
  label: string;
  multiline?: boolean;
  required?: boolean;
  kind?: "timeline" | "pricing";
  inputType?: string;
};

const CLIENT_INFO_FIELDS: FieldConfig[] = [
  { name: "clientName", label: "Client Name", required: true },
  { name: "companyName", label: "Company Name", required: true },
  { name: "dateOfCall", label: "Date of Call", required: true },
  { name: "salespersonName", label: "Salesperson Name", required: true },
  { name: "clientEmail", label: "Client Email (delivery address)", inputType: "email" },
];

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
  editable,
}: {
  proposalId: string;
  defaultValues: ProposalIntake;
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProposalIntake>({
    resolver: zodResolver(proposalIntakeSchema),
    // TimelineInput/PricingInput always *display* a real default (1 week /
    // $0) even when the underlying field is blank, so the form's actual
    // default must match that display from the first render — otherwise the
    // displayed value and the saved value silently disagree until the user
    // happens to touch the stepper.
    defaultValues: {
      ...defaultValues,
      proposedTimeline: defaultValues.proposedTimeline || formatTimeline(1, "weeks"),
      estimatedPricing: defaultValues.estimatedPricing || formatPricing(1, "USD"),
    },
  });

  function onSubmit(values: ProposalIntake) {
    startTransition(async () => {
      // Client Email is delivery routing metadata rather than generated
      // content, so it's still persisted through its own RPC internally —
      // but from the user's perspective, one "Save Intake" click saves
      // everything on this form, including email.
      const [intakeResult, emailResult] = await Promise.all([
        updateIntakeAction(proposalId, values),
        updateClientEmailAction(proposalId, values.clientEmail),
      ]);
      if (!intakeResult.ok) {
        toast.error(intakeResult.error.message);
      } else if (!emailResult.ok) {
        toast.error(emailResult.error.message);
      } else {
        toast.success("Intake saved.");
      }
    });
  }

  function renderField(field: FieldConfig) {
    return (
      <div key={field.name} className={field.multiline ? "sm:col-span-2 flex flex-col gap-2" : "flex flex-col gap-2"}>
        <Label htmlFor={field.name}>
          {field.label}
          {field.required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {field.kind === "timeline" || field.kind === "pricing" ? (
          <Controller
            name={field.name}
            control={control}
            render={({ field: { value, onChange } }) =>
              field.kind === "timeline" ? (
                <TimelineInput value={value} onChange={onChange} disabled={!editable} />
              ) : (
                <PricingInput value={value} onChange={onChange} disabled={!editable} />
              )
            }
          />
        ) : field.multiline ? (
          <Textarea id={field.name} disabled={!editable} rows={4} {...register(field.name)} />
        ) : (
          <Input id={field.name} type={field.inputType} disabled={!editable} {...register(field.name)} />
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
