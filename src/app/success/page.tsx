import { SiteNav } from "@/components/site-nav";
import { SuccessView } from "@/app/success/success-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bid received · Brand my Body",
};

type Props = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

function sessionIdFrom(searchParams: { session_id?: string | string[] }) {
  const raw = searchParams.session_id;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ?? "";
}

export default async function SuccessPage({ searchParams }: Props) {
  const sessionId = sessionIdFrom(await searchParams);

  if (!sessionId) {
    return (
      <div className="flex flex-1 flex-col">
        <SiteNav />
        <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16">
          <p className="text-xs tracking-[0.28em] uppercase text-accent">
            Checkout
          </p>
          <h1 className="mt-3 font-serif text-4xl">Could not record this bid</h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            Missing Checkout session.
          </p>
          <a
            href="/"
            className="mt-10 inline-flex rounded-full bg-accent px-5 py-3 text-sm text-white hover:brightness-110"
          >
            Back to Brand my Body
          </a>
        </main>
      </div>
    );
  }

  return <SuccessView sessionId={sessionId} />;
}
