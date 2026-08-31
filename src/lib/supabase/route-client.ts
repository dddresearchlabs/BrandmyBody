import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export function supabaseUrlAndKey() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return { url, anonKey };
}

export function requestOrigin(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwarded) {
    return `${proto}://${forwarded.split(",")[0]!.trim()}`;
  }
  return request.nextUrl.origin;
}

/** Route-handler client that writes auth cookies onto `response`. */
export function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, anonKey } = supabaseUrlAndKey();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(cacheHeaders ?? {}).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });
}
