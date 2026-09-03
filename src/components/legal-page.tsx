import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-accent">Legal</p>
        <h1 className="mt-3 font-serif text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">{description}</p>
        <div className="mt-10 grid gap-6 text-sm leading-7 text-muted [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-foreground [&_a]:text-accent [&_a]:hover:underline [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5">
          {children}
        </div>
      </main>
    </div>
  );
}
