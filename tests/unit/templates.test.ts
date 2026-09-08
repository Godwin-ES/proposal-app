import { describe, expect, it } from "vitest";
import { buildProposalText, buildNextSteps } from "@/lib/templates/proposal";
import { buildClientEmail } from "@/lib/templates/client-email";

describe("proposal template", () => {
  const snapshot = {
    client: {
      clientName: "Jane Doe",
      companyName: "Acme Co",
      dateOfCall: "2026-01-15",
      salespersonName: "Sam Rep",
    },
    content: {
      introduction: "We understand Acme Co needs faster onboarding.",
      projectScope: "Build an onboarding portal.",
      recommendedApproach: "Phased rollout starting with pilot team.",
      deliverables: ["Onboarding portal", "Admin dashboard"],
      timeline: "6 weeks",
      pricing: "$12,000",
      nextSteps: buildNextSteps(),
    },
  };

  it("includes every reference section heading", () => {
    const text = buildProposalText(snapshot);
    expect(text).toContain("Introduction");
    expect(text).toContain("Project Scope");
    expect(text).toContain("Recommended Approach");
    expect(text).toContain("Deliverables");
    expect(text).toContain("Timeline");
    expect(text).toContain("Pricing");
    expect(text).toContain("Next Steps");
  });

  it("includes client-facing metadata and body content", () => {
    const text = buildProposalText(snapshot);
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Acme Co");
    expect(text).toContain("Sam Rep");
    expect(text).toContain("$12,000");
    expect(text).toContain("6 weeks");
    expect(text).toContain("Onboarding portal");
  });

  it("builds deterministic non-empty next steps copy", () => {
    expect(buildNextSteps().length).toBeGreaterThan(0);
  });
});

describe("client email template", () => {
  it("references the company in the subject", () => {
    const email = buildClientEmail({
      clientName: "Jane Doe",
      companyName: "Acme Co",
      salespersonName: "Sam Rep",
      proposalLink: "https://example.com/p/123",
    });
    expect(email.subject).toContain("Acme Co");
  });

  it("includes client name, proposal link, and salesperson signature", () => {
    const email = buildClientEmail({
      clientName: "Jane Doe",
      companyName: "Acme Co",
      salespersonName: "Sam Rep",
      proposalLink: "https://example.com/p/123",
    });
    expect(email.body).toContain("Jane Doe");
    expect(email.body).toContain("https://example.com/p/123");
    expect(email.body).toContain("Sam Rep");
  });
});
