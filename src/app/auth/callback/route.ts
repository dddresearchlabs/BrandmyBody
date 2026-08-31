import { createUserClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"), "/account");

  if (code) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("error", "auth");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
