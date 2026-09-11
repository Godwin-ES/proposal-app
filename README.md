# Koya Proposal Studio

An AI-assisted sales proposal application for Koya Talent: a salesperson captures a discovery call, generates a client-ready proposal with Claude, an independent approver signs off on the exact version submitted, and the approved PDF is emailed to the client — every step logged and immutable once it happens.

## Product structure

- **Dashboard (Salesperson)** — proposals grouped into In Progress / Pending Approval / Approved / Delivered, with the intake form, supporting-material upload, AI generation, in-place section editing, and section regeneration.
- **Approvals (Approver)** — a queue of proposals awaiting review, plus Changes Requested and Approved history. Review is read-only against the *exact* version submitted, never a live document. Self-approval is blocked at the database level.
- **Delivery (Salesperson)** — final PDF generation from the approved version, controlled send to the client's email via Resend, and a full delivery attempt history (including recoverable "uncertain outcome" handling if a send can't be confirmed).

Proposal content is versioned: every AI generation, section regeneration, or manual edit creates a new immutable snapshot rather than overwriting the last one, so the exact content an approver signed off on can never silently change underneath them.

## Tech stack

- **Next.js 16** (App Router) + TypeScript, Tailwind, shadcn/ui
- **Supabase** — Postgres, Auth, and Storage, with RLS policies and `security definer` RPCs enforcing every workflow transition (submission, approval, delivery) at the database layer, not just in application code
- **Claude** (`@anthropic-ai/sdk`)
- **@react-pdf/renderer** for the final client-facing PDF
- **Resend** for delivery email
- **Vitest** (unit + integration against the real hosted Supabase project) and **Playwright** (e2e)

## Local setup

Requires Node 20+ and pnpm.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   You'll need a Supabase project (URL + anon key), an Anthropic API key and a Resend API key. See [Environment variables](#environment-variables) below.

3. Apply the database schema — run every SQL file in `supabase/migrations/` in order against your Supabase project via the SQL Editor.

4. Start the dev server:

   ```bash
   pnpm dev
   ```

5. Open <http://localhost:3000>.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Local dev/tests only | Not read by the app itself — only used by the integration test suite and one-off admin scripts. Never expose client-side. |
| `ANTHROPIC_API_KEY` | Yes | Claude generation — model itself is a per-request choice in the UI (Sonnet 5 or Haiku 4.5), not env-configured |
| `RESEND_API_KEY` | Yes | Delivery email |
| `EMAIL_FROM` | Yes | Supports `"Display Name <address>"` format |
| `RESEND_SANDBOX_RECIPIENT` | Optional | Redirects every send to one inbox at the provider boundary only — the UI, delivery history, and readiness checks still show the real client email untouched. Useful on Resend's sandbox sender, which can only deliver to the account's own address anyway. |
| `DISCORD_SALES_WEBHOOK_URL` | Optional | Discord notifications for the salesperson: a decision (approved / changes requested) on their proposal. |
| `DISCORD_APPROVER_WEBHOOK_URL` | Optional | Discord notifications for the approver: a proposal submitted for approval, or a submission withdrawn. |
| `DISCORD_ERRORS_WEBHOOK_URL` | Optional | Discord alert for unexpected/system-level errors (AI, document, delivery, material, storage failures) — also always logged to the `error_logs` table regardless of whether this is set. |
| `TEST_SALES_EMAIL` / `TEST_SALES_PASSWORD` | Local dev/tests only | Credentials for a salesperson demo account, used by the integration and e2e suites. Never commit real credentials — set locally in `.env.local`. |
| `TEST_APPROVER_EMAIL` / `TEST_APPROVER_PASSWORD` | Local dev/tests only | Credentials for an approver demo account, used by the integration and e2e suites. Never commit real credentials — set locally in `.env.local`. |

## Tests

```bash
pnpm test        # unit + integration (vitest)
pnpm test:e2e    # full login-to-delivery flow (playwright)
pnpm check       # lint + typecheck + unit/integration tests
```
