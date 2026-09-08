"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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

type FieldConfig = { name: keyof ProposalIntake; label: string; multiline?: boolean; required?: boolean };

const SECTIONS: { title: string; fields: FieldConfig[] }[] = [
  {
    title: "Client Information",
    fields: [
      { name: "clientName", label: "Client Name", required: true },
      { name: "companyName", label: "Company Name", required: true },
      { name: "dateOfCall", label: "Date of Call" },
      { name: "salespersonName", label: "Salesperson Name", required: true },
    ],
  },
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
      { name: "recommendedServices", label: "Recommended Services / Deliverables", multiline: true },
    ],
  },
  {
    title: "Commercial Details",
    fields: [
      { name: "proposedTimeline", label: "Proposed Timeline" },
      { name: "estimatedPricing", label: "Estimated Pricing" },
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
  const [emailPending, startEmailTransition] = useTransition();
  const [clientEmail, setClientEmail] = useState(defaultValues.clientEmail);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProposalIntake>({
    resolver: zodResolver(proposalIntakeSchema),
    defaultValues,
  });

  function onSubmit(values: ProposalIntake) {
    startTransition(async () => {
      const result = await updateIntakeAction(proposalId, { ...values, clientEmail: defaultValues.clientEmail });
      if (result.ok) {
        toast.success("Intake saved.");
      } else {
        toast.error(result.error.message);
      }
    });
  }

  function onSaveEmail() {
    startEmailTransition(async () => {
      const result = await updateClientEmailAction(proposalId, clientEmail);
      if (result.ok) {
        toast.success("Client email saved.");
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex-1">
            <Label htmlFor="clientEmail">Client Email (delivery address)</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@company.com"
            />
          </div>
          <Button type="button" onClick={onSaveEmail} disabled={emailPending} variant="secondary">
            {emailPending ? "Saving..." : "Save Email"}
          </Button>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div
                  key={field.name}
                  className={field.multiline ? "sm:col-span-2 flex flex-col gap-2" : "flex flex-col gap-2"}
                >
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  {field.multiline ? (
                    <Textarea id={field.name} disabled={!editable} rows={4} {...register(field.name)} />
                  ) : (
                    <Input id={field.name} disabled={!editable} {...register(field.name)} />
                  )}
                  {errors[field.name] ? (
                    <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
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
