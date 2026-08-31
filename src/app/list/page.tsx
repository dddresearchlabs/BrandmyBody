import { ListForm } from "@/app/list/list-form";
import { SiteNav } from "@/components/site-nav";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "List a body · Brand my Body",
  description: "Create a Brand my Body listing.",
};

export default async function ListPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/list");

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-accent">
          Marketplace
        </p>
        <h1 className="mt-3 font-serif text-4xl">List a body</h1>
        <p className="mt-3 text-muted">
          Brands bid on logo spots printed as ink tattoos. Paid placement, not
          an endorsement.
        </p>
        <ListForm />
      </main>
    </div>
  );
}
