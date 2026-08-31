"use client";

import { useEffect, useState } from "react";
import { timeLeftLabel } from "@/lib/listings";

export function TimeLeft({ endsAt, className }: { endsAt: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className={className}>{now === null ? "—" : timeLeftLabel(endsAt, now)}</span>;
}
