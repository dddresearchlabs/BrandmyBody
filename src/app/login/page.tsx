import { LoginForm } from "@/app/login/login-form";
import { SiteNav } from "@/components/site-nav";
import { getSessionUser, safeNextPath } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Log in · Brand my Body",
  description: "Sign in to list a body on Brand my Body.",
};

type Props = {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/account");
  const user = await getSessionUser();
  if (user) redirect(next);

  const errorRaw = Array.isArray(params.error) ? params.error[0] : params.error;
  const initialError =
    errorRaw === "auth" ? "Could not finish sign in. Try again." : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-accent">
          Account
        </p>
        <h1 className="mt-3 font-serif text-4xl">Log in</h1>
        <p className="mt-3 text-muted">
          Email a magic link. No password. Use the link or the 6-digit code for
          tests.
        </p>
        <LoginForm next={next} initialError={initialError} />
      </main>
    </div>
  );
}
