import { ConnectButton } from "@/app/connect/connect-button";
import { SiteNav } from "@/components/site-nav";
import { getSessionUser } from "@/lib/auth";
import { connectStatus, connectStatusLabel } from "@/lib/connect";
import { fetchListerAccount } from "@/lib/lister-accounts";
import { publicError } from "@/lib/public-error";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connect · Brand my Body",
  description: "Connect Stripe Express payouts for your listings.",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ConnectPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/connect");

  const params = await searchParams;
  const queryError =
    typeof params.error === "string" && params.error.trim()
      ? params.error.trim().slice(0, 280)
      : null;

  let loadError: string | null = null;
  let status = connectStatus({ stripeAccountId: null, chargesEnabled: false });
  try {
    const account = await fetchListerAccount(user.id);
    status = connectStatus(account);
  } catch (err) {
    loadError = publicError(err, "Could not load Connect status");
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-accent">
          Account
        </p>
        <h1 className="mt-3 font-serif text-4xl">Connect payouts</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          Stripe Connect Express, test mode. Brands pay a 20% deposit; 10% of
          that deposit is the platform fee. Payouts go to this account when
          charges are enabled.
        </p>
        {loadError ? (
          <p className="mt-8 text-accent">{loadError}</p>
        ) : (
          <>
            <p className="mt-8 text-sm">
              Status:{" "}
              <span className="capitalize text-accent">
                {connectStatusLabel(status)}
              </span>
            </p>
            <ConnectButton status={status} />
          </>
        )}
        {queryError ? <p className="mt-4 text-sm text-accent">{queryError}</p> : null}
      </main>
    </div>
  );
}
