import { SiteNav } from "@/components/site-nav";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connect · Brand my Body",
  description: "Stripe Connect comes later.",
};

export default async function ConnectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/connect");

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-accent">
          Account
        </p>
        <h1 className="mt-3 font-serif text-4xl">Connect later</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          Stripe Connect is not wired yet. Test checkout stays as it is.
        </p>
      </main>
    </div>
  );
}
