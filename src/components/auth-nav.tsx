"use client";

import { useEffect, useState } from "react";
import { accountDisplayName } from "@/lib/account-name";
import { createClient } from "@/lib/supabase/client";

export function AuthNav() {
  const [name, setName] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) setName(accountDisplayName(data.user));
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setName(accountDisplayName(session?.user ?? null));
      });
      return () => {
        cancelled = true;
        data.subscription.unsubscribe();
      };
    } catch {
      setName(null);
    }
  }, []);

  if (name === undefined) {
    return null;
  }

  if (!name) {
    return (
      <a href="/login" className="hover:text-foreground">
        Log in
      </a>
    );
  }

  return (
    <>
      <span className="max-w-[14rem] truncate text-foreground" title={name}>
        {name}
      </span>
      <a href="/account" className="hover:text-foreground">
        Account
      </a>
      <a href="/logout" className="hover:text-foreground">
        Log out
      </a>
    </>
  );
}
