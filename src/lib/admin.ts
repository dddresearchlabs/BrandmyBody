import "server-only";

export function isAdminEmail(email: string | null | undefined) {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const value = email?.trim().toLowerCase() ?? "";
  return Boolean(value && allowed.has(value));
}
