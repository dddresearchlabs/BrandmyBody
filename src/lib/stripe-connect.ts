import "server-only";
import Stripe from "stripe";
import { getStripe, assertStripeTestMode } from "@/lib/stripe";
import { publicError } from "@/lib/public-error";

const INCLUDE = [
  "configuration.recipient",
  "identity",
  "requirements",
] as const;

const V2_OPTS = { apiVersion: "2026-08-26.dahlia" } as const;

function v2() {
  return getStripe().v2.core;
}

export function stripeErrorText(err: unknown, fallback: string) {
  return publicError(err, fallback);
}

export function recipientTransfersActive(account: Stripe.V2.Core.Account) {
  return (
    account.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status === "active"
  );
}

export async function retrieveV2Account(accountId: string) {
  const account = await v2().accounts.retrieve(
    accountId,
    { include: [...INCLUDE] },
    V2_OPTS,
  );
  assertStripeTestMode(account);
  return account;
}

function isMissingOrV1(err: unknown) {
  if (err instanceof Stripe.errors.StripeError) {
    if (err.code === "resource_missing") return true;
    const message = err.message.toLowerCase();
    return (
      /no such account/.test(message) ||
      /accounts v1/.test(message) ||
      /type[= ]express/.test(message) ||
      /use the accounts v2 api/.test(message)
    );
  }
  return false;
}

export async function createV2RecipientAccount(email: string, userId: string) {
  const account = await v2().accounts.create(
    {
      contact_email: email,
      display_name: email,
      dashboard: "express",
      identity: { country: "us" },
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: { stripe_transfers: { requested: true } },
          },
        },
      },
      metadata: { userId },
      include: [...INCLUDE],
    },
    V2_OPTS,
  );
  assertStripeTestMode(account);
  return account;
}

export async function getOrCreateV2RecipientAccount(
  existingId: string | null,
  email: string,
  userId: string,
) {
  if (existingId) {
    try {
      return await retrieveV2Account(existingId);
    } catch (err) {
      if (!isMissingOrV1(err)) throw err;
    }
  }
  return createV2RecipientAccount(email, userId);
}

export async function createV2AccountOnboardingLink(
  accountId: string,
  origin: string,
) {
  const link = await v2().accountLinks.create(
    {
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${origin}/connect`,
          return_url: `${origin}/connect/callback`,
        },
      },
    },
    V2_OPTS,
  );
  assertStripeTestMode(link);
  return link;
}
