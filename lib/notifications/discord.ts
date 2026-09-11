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

type DiscordEmbed = {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
};

async function postEmbed(webhookUrl: string | undefined, embed: DiscordEmbed): Promise<void> {
  if (!webhookUrl) return;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embeds: [{ ...embed, timestamp: embed.timestamp ?? new Date().toISOString() }] }),
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

/** Base URL for links back into the app from a Discord message. Defaults to
 * local dev; set APP_URL in production (e.g. to the Vercel deployment URL)
 * so links actually resolve for whoever clicks them. */
function appUrl(path: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function proposalLabel(clientName: string, companyName: string): string {
  const client = clientName.trim() || "Unnamed client";
  return companyName.trim() ? `${client} (${companyName.trim()})` : client;
}

const COLOR = {
  submitted: 0x3498db, // blue
  withdrawn: 0x95a5a6, // gray
  approved: 0x2ecc71, // green
  changesRequested: 0xe67e22, // amber
  error: 0xe74c3c, // red
} as const;

export async function notifyApproverProposalSubmitted(input: {
  proposalId: string;
  clientName: string;
  companyName: string;
  salespersonName: string;
}): Promise<void> {
  await postEmbed(process.env.DISCORD_APPROVER_WEBHOOK_URL, {
    title: `📥 ${proposalLabel(input.clientName, input.companyName)}`,
    description: "Submitted for approval — click the title to review it.",
    url: appUrl(`/approvals/${input.proposalId}`),
    color: COLOR.submitted,
    fields: [{ name: "Submitted by", value: input.salespersonName, inline: true }],
  });
}

export async function notifyApproverProposalWithdrawn(input: {
  proposalId: string;
  clientName: string;
  companyName: string;
  salespersonName: string;
}): Promise<void> {
  await postEmbed(process.env.DISCORD_APPROVER_WEBHOOK_URL, {
    title: `↩️ ${proposalLabel(input.clientName, input.companyName)}`,
    description: "Withdrawn from approval — back in Draft. No action needed.",
    url: appUrl(`/approvals/${input.proposalId}`),
    color: COLOR.withdrawn,
    fields: [{ name: "Withdrawn by", value: input.salespersonName, inline: true }],
  });
}

export async function notifySalespersonDecision(input: {
  proposalId: string;
  clientName: string;
  companyName: string;
  decision: "approved" | "changes_requested";
  comments: string | null;
}): Promise<void> {
  const label = proposalLabel(input.clientName, input.companyName);
  const decided = input.decision === "approved";
  await postEmbed(process.env.DISCORD_SALES_WEBHOOK_URL, {
    title: `${decided ? "✅" : "✏️"} ${label}`,
    description: decided ? "Approved — click the title to open it." : "Changes were requested — click the title to review.",
    url: appUrl(`/proposals/${input.proposalId}`),
    color: decided ? COLOR.approved : COLOR.changesRequested,
    fields: input.comments ? [{ name: "Approver comments", value: input.comments }] : undefined,
  });
}

/** Unexpected/system-level failures only — see lib/notifications/action-error.ts
 * for what counts as "unexpected" vs. a routine, expected user-facing error. */
export async function notifySystemError(input: {
  stage: string;
  code: string;
  message: string;
  role?: string;
  proposalId?: string;
}): Promise<void> {
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Stage", value: input.stage, inline: true },
  ];
  if (input.role) fields.push({ name: "Role", value: input.role, inline: true });

  await postEmbed(process.env.DISCORD_ERRORS_WEBHOOK_URL, {
    title: `🚨 ${input.code}`,
    description: input.message,
    // Salesperson vs. approver land on different workspaces for the same
    // proposal id; the salesperson's page is the reasonable default since
    // most error stages originate on their side (generation, materials,
    // delivery, editing) — approval-side errors are rarer and the approver
    // can still be found from the proposal id in the message either way.
    url: input.proposalId ? appUrl(`/proposals/${input.proposalId}`) : undefined,
    color: COLOR.error,
    fields,
  });
}
