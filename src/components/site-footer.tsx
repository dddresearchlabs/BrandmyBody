export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center text-sm text-muted sm:flex-row sm:justify-between sm:text-left">
        <p>Brand my Body. Paid placement, not an endorsement.</p>
        <nav aria-label="Legal" className="flex gap-5">
          <a href="/terms" className="hover:text-foreground">
            Terms
          </a>
          <a href="/privacy" className="hover:text-foreground">
            Privacy
          </a>
        </nav>
      </div>
    </footer>
  );
}
