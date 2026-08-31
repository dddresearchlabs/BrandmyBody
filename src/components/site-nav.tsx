import type { ReactNode } from "react";

export function SiteNav({
  extra,
  lead,
}: {
  extra?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <a href="/" className="text-sm tracking-wide">
            Brand my Body
          </a>
          {lead}
        </div>
        <nav
          aria-label="Site"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted"
        >
          <a href="/browse" className="hover:text-foreground">
            Browse
          </a>
          <a href="/list" className="hover:text-foreground">
            List a body
          </a>
          {extra}
        </nav>
      </div>
    </header>
  );
}
