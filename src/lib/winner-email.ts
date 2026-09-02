import "server-only";
import { formatUsd } from "@/lib/auction";
import { BALANCE_DUE_DAYS, balanceCents } from "@/lib/bid-money";
import { publicError } from "@/lib/public-error";

function fromAddress() {
  const raw = process.env.RESEND_FROM?.trim();
  return raw || "Brand my Body <beth.t@example.com>";
}

function dueLabel(dueAt: string) {
  const date = new Date(dueAt);
  if (!Number.isFinite(date.getTime())) return "7 days";
  return `${date.toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  })} UTC`;
}

export async function sendWinnerPayEmail(input: {
  email: string;
  listingName: string;
  spotName: string;
  brandName: string;
  bidCents: number;
  payUrl: string;
  dueAt: string;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { error: "Winner email is not configured (RESEND_API_KEY)" };
  }
  const to = input.email.trim();
  if (!to.includes("@")) {
    return { error: "Winner email is missing" };
  }
  const remaining = formatUsd(balanceCents(input.bidCents));
  const due = dueLabel(input.dueAt);
  const brand = input.brandName.trim() || "Your brand";
  const subject = `You won ${input.spotName} on ${input.listingName}`;
  const text = [
    `${brand} won ${input.spotName} on ${input.listingName}.`,
    "",
    `Pay the remaining 80% (${remaining}) within ${BALANCE_DUE_DAYS} days, by ${due}:`,
    input.payUrl,
    "",
    "If you do not pay by then, you lose your 20% deposit.",
    "",
    "Paid placement, not an endorsement. Brand my Body.",
  ].join("\n");
  const html = `<p>${escapeHtml(brand)} won ${escapeHtml(input.spotName)} on ${escapeHtml(input.listingName)}.</p>
<p>Pay the remaining 80% (${escapeHtml(remaining)}) within ${BALANCE_DUE_DAYS} days, by ${escapeHtml(due)}:</p>
<p><a href="${escapeHtml(input.payUrl)}">${escapeHtml(input.payUrl)}</a></p>
<p>If you do not pay by then, you lose your 20% deposit.</p>
<p>Paid placement, not an endorsement. Brand my Body.</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      return { error: "Could not email the winner" };
    }
    return { error: null as string | null };
  } catch (err) {
    return { error: publicError(err, "Could not email the winner") };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
