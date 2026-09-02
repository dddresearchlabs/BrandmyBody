type AccountUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export function accountDisplayName(user: AccountUser | null | undefined) {
  const meta = user?.user_metadata ?? {};
  for (const key of ["full_name", "name", "display_name"] as const) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const email = user?.email?.trim();
  return email || null;
}
