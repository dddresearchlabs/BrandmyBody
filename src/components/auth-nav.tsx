"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthNav() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) setEmail(data.user?.email ?? null);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setEmail(session?.user?.email ?? null);
      });
      return () => {
        cancelled = true;
        data.subscription.unsubscribe();
      };
    } catch {
      setEmail(null);
    }
  }, []);

  if (email === undefined) {
    return null;
  }

  if (!email) {
    return (
      <a href="/login" className="hover:text-foreground">
        Log in
      </a>
    );
  }

  return (
    <>
      <a href="/account" className="hover:text-foreground">
        Account
      </a>
      <a href="/logout" className="hover:text-foreground">
        Log out
      </a>
    </>
  );
}
