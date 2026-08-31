import "server-only";
import { createUserClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export function safeNextPath(value: unknown, fallback = "/") {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return fallback;
  const next = raw.trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createUserClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
