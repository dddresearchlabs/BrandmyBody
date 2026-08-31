export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <p className="text-xs tracking-[0.28em] uppercase text-accent">
        Brand my Body
      </p>
      <h1 className="mt-4 font-serif text-4xl">Not found</h1>
      <p className="mt-3 text-muted">That listing is not in the mock store.</p>
      <a href="/account" className="mt-8 text-sm text-accent hover:underline">
        Back to account
      </a>
    </div>
  );
}
