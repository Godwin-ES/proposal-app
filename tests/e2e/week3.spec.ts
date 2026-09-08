import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { completeIntake } from "../fixtures/complete-intake";

/**
 * Covers the major Week 3 user journey end to end against a real running app,
 * real hosted Supabase, and a real (cheap) Gemini call for generation — per
 * §19 this suite intentionally does not repeat this on every CI run with
 * Claude to avoid real model cost; the Claude path is verified once manually
 * per Build Notes and covered by mocked-provider integration tests.
 *
 * Requires the demo accounts from supabase/migrations to exist (see
 * ../../BUILD-NOTES-NEXTJS.md — created manually via the Supabase dashboard/API,
 * not part of this repo).
 */

const SALES_EMAIL = "sales.demo@koyatalent.test";
const SALES_PASSWORD = "DemoSales123!";
const APPROVER_EMAIL = "approver.demo@koyatalent.test";
const APPROVER_PASSWORD = "DemoApprover123!";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|approvals)$/);
}

test.describe.configure({ mode: "serial" });

let proposalId = "";

test.afterAll(async () => {
  if (!proposalId) return;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  await admin.from("proposals").delete().eq("id", proposalId);
});

test("full proposal lifecycle: intake -> generation -> regeneration -> approval -> delivery", async ({ browser }) => {
  const salesContext = await browser.newContext();
  const salesPage = await salesContext.newPage();

  await test.step("Salesperson creates a proposal and fills intake", async () => {
    await login(salesPage, SALES_EMAIL, SALES_PASSWORD);
    await salesPage.click("text=New Proposal");
    await salesPage.waitForURL("**/proposals/new");
    await salesPage.click("text=Start New Proposal");
    await salesPage.waitForURL(/\/proposals\/[0-9a-f-]+$/);
    proposalId = salesPage.url().split("/").pop()!;

    await salesPage.fill("#clientName", completeIntake.clientName);
    await salesPage.fill("#companyName", completeIntake.companyName);
    await salesPage.fill("#dateOfCall", completeIntake.dateOfCall);
    await salesPage.fill("#salespersonName", completeIntake.salespersonName);
    await salesPage.fill("#clientNeedsSummary", completeIntake.clientNeedsSummary);
    await salesPage.fill("#goalsAndObjectives", completeIntake.goalsAndObjectives);
    await salesPage.fill("#projectScope", completeIntake.projectScope);
    await salesPage.fill("#recommendedServices", completeIntake.recommendedServices);
    await salesPage.fill("#proposedTimeline", completeIntake.proposedTimeline);
    await salesPage.fill("#estimatedPricing", completeIntake.estimatedPricing);
    await salesPage.click("text=Save Intake");
    await expect(salesPage.locator("text=Intake saved.")).toBeVisible({ timeout: 10_000 });

    // Use Resend's guaranteed-success sandbox address so the delivery step
    // later in this test has a deterministic outcome.
    await salesPage.fill("#clientEmail", "delivered@resend.dev");
    await salesPage.click("text=Save Email");
    await expect(salesPage.locator("text=Client email saved.")).toBeVisible({ timeout: 10_000 });
  });

  await test.step("Salesperson generates the initial draft with Gemini", async () => {
    await salesPage.getByLabel("AI Provider").click();
    await salesPage.getByRole("option", { name: "Gemini" }).click();
    await salesPage.click('button:has-text("Generate Draft")');
    await salesPage.waitForSelector("text=Version History", { timeout: 30_000 });
    await expect(salesPage.locator("text=/Version \\d+/").first()).toContainText("Version 1");
  });

  await test.step("Regenerating Deliverables changes only that section", async () => {
    const introductionBefore = await salesPage
      .locator('[data-slot="card"]', { hasText: "Introduction" })
      .first()
      .innerText();

    await salesPage.getByRole("button", { name: "Regenerate Deliverables" }).click();
    await salesPage.fill("#regen-instruction", "Add a deliverable for a quarterly reconciliation summary report.");
    await salesPage.click('button:has-text("Regenerate")');
    await salesPage.waitForSelector("text=Version 2", { timeout: 30_000 });

    const introductionAfter = await salesPage
      .locator('[data-slot="card"]', { hasText: "Introduction" })
      .first()
      .innerText();
    expect(introductionAfter).toBe(introductionBefore);
  });

  await test.step("Sending is blocked before approval", async () => {
    await salesPage.goto(`/delivery/${proposalId}`);
    await expect(salesPage.locator('button:has-text("Send Proposal")')).toBeDisabled();
  });

  await test.step("Salesperson submits for approval; workspace becomes read-only", async () => {
    await salesPage.goto(`/proposals/${proposalId}`);
    await salesPage.click('button:has-text("Submit for Approval")');
    await salesPage.locator('[role="alertdialog"]').getByRole("button", { name: "Submit", exact: true }).click();
    await salesPage.waitForTimeout(3000);
    await salesPage.reload();
    await expect(salesPage.locator("text=Pending Approval")).toBeVisible();
    await expect(salesPage.getByRole("button", { name: "Edit Introduction" })).toHaveCount(0);
  });

  const approverContext = await browser.newContext();
  const approverPage = await approverContext.newPage();

  await test.step("Approver reviews the exact submitted version and approves", async () => {
    await login(approverPage, APPROVER_EMAIL, APPROVER_PASSWORD);
    await approverPage.click(`a[href="/approvals/${proposalId}"]`);
    await approverPage.waitForSelector("text=exact submitted version");
    await approverPage.click('button:has-text("Approve Proposal")');
    await approverPage.locator('[role="alertdialog"]').getByRole("button", { name: "Approve", exact: true }).click();
    await approverPage.waitForURL("**/approvals");
  });

  await test.step("Salesperson generates the final PDF and sends it; delivery is logged", async () => {
    await salesPage.goto(`/delivery/${proposalId}`, { waitUntil: "networkidle" });
    await salesPage.click('button:has-text("Generate Final PDF")');
    await salesPage.waitForSelector("text=Download PDF", { timeout: 20_000 });

    await salesPage.click('button:has-text("Send Proposal")');
    await salesPage.locator('[role="alertdialog"]').getByRole("button", { name: "Send", exact: true }).click();
    await salesPage.waitForTimeout(5000);
    await salesPage.reload({ waitUntil: "networkidle" });

    await expect(salesPage.locator("text=sent").first()).toBeVisible();
  });
});
