"use client";

import { useState } from "react";
import type { ConnectStatus } from "@/lib/connect";

export function ConnectButton({ status }: { status: ConnectStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function start() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/connect", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start Connect");
        setSubmitting(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Could not start Connect");
      setSubmitting(false);
    }
  }

  const label =
    status === "pending"
      ? "Continue Connect"
      : status === "ready"
        ? "Update payouts"
        : "Connect payouts";

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={submitting}
        className="mt-8 rounded-full bg-accent px-4 py-2 text-sm text-white hover:brightness-110 disabled:opacity-50"
      >
        {submitting ? "Redirecting…" : label}
      </button>
      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
    </div>
  );
}
