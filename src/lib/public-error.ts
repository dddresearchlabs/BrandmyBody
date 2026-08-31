const SECRETISH =
  /service.?role|secret|apikey|authorization|bearer\s+[a-z0-9._-]+|eyj[a-z0-9_-]{20,}|sk_(live|test)_|supabase\.co\/[^\s]+/i;

function collect(err: unknown, depth = 0): string[] {
  if (!err || depth > 4) return [];
  if (typeof err === "string") return err.trim() ? [err.trim()] : [];
  if (typeof err !== "object") return [];
  const row = err as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
    cause?: unknown;
  };
  const out: string[] = [];
  for (const value of [row.message, row.details, row.hint, row.code]) {
    if (typeof value === "string" && value.trim()) out.push(value.trim());
  }
  if (row.cause) out.push(...collect(row.cause, depth + 1));
  return out;
}

function firstLine(value: string) {
  return value.split(/\r?\n/)[0].replace(/\s+/g, " ").trim();
}

export function publicError(err: unknown, fallback = "Something went wrong") {
  const parts = [...new Set(collect(err).map(firstLine).filter(Boolean))];
  let message = parts.join(" — ") || fallback;
  if (/fetch failed|enotfound|econnrefused|etimedout/i.test(message)) {
    message = "Could not reach Supabase";
  }
  if (SECRETISH.test(message)) return fallback;
  return message.slice(0, 280) || fallback;
}
