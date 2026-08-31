import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { publicError } from "@/lib/public-error";
import {
  createRouteHandlerClient,
  requestOrigin,
} from "@/lib/supabase/route-client";

export const dynamic = "force-dynamic";

const NEXT_COOKIE = "bmb-next";

function authMessage(err: unknown) {
  const message = publicError(err, "Could not finish sign in. Try again.");
  if (/code verifier|pkce|verifier should be non-empty/i.test(message)) {
    return "Open the login link in the same browser you used to request it.";
  }
  return message;
}

function redirectToLogin(origin: string, next: string, message: string) {
  const login = new URL("/login", origin);
  login.searchParams.set("error", message.slice(0, 180));
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(
    request.nextUrl.searchParams.get("next") ??
      request.cookies.get(NEXT_COOKIE)?.value,
    "/account",
  );

  if (!code) {
    const description =
      request.nextUrl.searchParams.get("error_description") ??
      request.nextUrl.searchParams.get("error");
    return redirectToLogin(
      origin,
      next,
      description
        ? publicError(description, "Could not finish sign in. Try again.")
        : "Could not finish sign in. Try again.",
    );
  }

  const success = NextResponse.redirect(new URL(next, origin));
  success.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });

  try {
    const supabase = createRouteHandlerClient(request, success);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectToLogin(origin, next, authMessage(error));
    }
    return success;
  } catch (err) {
    return redirectToLogin(origin, next, authMessage(err));
  }
}
