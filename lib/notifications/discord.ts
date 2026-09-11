import "server-only";

/**
 * Plain Discord incoming-webhook notifications — no bot, no OAuth. Each
 * channel this app posts to (#sales-notifications, #approver-notifications,
 * #system-errors) has its own webhook URL configured as an env var; any of
 * them being unset just means that channel's notifications silently no-op,
 * so this feature can be wired up one channel at a time without breaking
 * anything. A Discord outage or a bad webhook URL must never break the
 * actual workflow it's reporting on — every call here swallows its own
 * errors after logging to the server console.
 */
async function postToDiscord(webhookUrl: string | undefined, content: string): Promise<void> {
  if (!webhookUrl) return;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      console.error(`Discord webhook responded ${res.status}: ${await res.text().catch(() => "")}`);
    }
  } catch (error) {
    console.error("Failed to post Discord notification:", error);
  }
}

/** Runs a best-effort side notification (fetching context + posting to
 * Discord) without ever letting it turn an already-successful business
 * operation into a reported failure — a Discord/notification hiccup must
 * never mask that the actual submit/decide/withdraw/etc. already succeeded. */
export async function bestEffort(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error("Notification step failed (non-fatal):", error);
  }
}

function proposalLabel(clientName: string, companyName: string): string {
  const client = clientName.trim() || "Unnamed client";
  return companyName.trim() ? `${client} (${companyName.trim()})` : client;
}

export async function notifyApproverProposalSubmitted(input: {
  proposalId: string;
  clientName: string;
  companyName: string;
  salespersonName: string;
}): Promise<void> {
  await postToDiscord(
    process.env.DISCORD_APPROVER_WEBHOOK_URL,
    `📥 **${proposalLabel(input.clientName, input.companyName)}** was submitted for approval by ${input.salespersonName}.`
  );
}

export async function notifyApproverProposalWithdrawn(input: {
  proposalId: string;
  clientName: string;
  companyName: string;
  salespersonName: string;
}): Promise<void> {
  await postToDiscord(
    process.env.DISCORD_APPROVER_WEBHOOK_URL,
    `↩️ ${input.salespersonName} withdrew **${proposalLabel(input.clientName, input.companyName)}** from approval — it's back in Draft.`
  );
}

export async function notifySalespersonDecision(input: {
  proposalId: string;
  clientName: string;
  companyName: string;
  decision: "approved" | "changes_requested";
  comments: string | null;
}): Promise<void> {
  const label = proposalLabel(input.clientName, input.companyName);
  const content =
    input.decision === "approved"
      ? `✅ **${label}** was approved.`
      : `✏️ Changes were requested on **${label}**${input.comments ? `: "${input.comments}"` : "."}`;
  await postToDiscord(process.env.DISCORD_SALES_WEBHOOK_URL, content);
}

/** Unexpected/system-level failures only — see lib/actions/run-action.ts for
 * what counts as "unexpected" vs. a routine, expected user-facing error. */
export async function notifySystemError(input: {
  stage: string;
  code: string;
  message: string;
  role?: string;
  proposalId?: string;
}): Promise<void> {
  const where = input.proposalId ? ` (proposal ${input.proposalId})` : "";
  const who = input.role ? ` [${input.role}]` : "";
  await postToDiscord(
    process.env.DISCORD_ERRORS_WEBHOOK_URL,
    `🚨 **${input.code}** at \`${input.stage}\`${who}${where}: ${input.message}`
  );
}
