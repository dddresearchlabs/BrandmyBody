import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  try {
    const supabase = createRouteHandlerClient(request, response);
    await supabase.auth.signOut();
  } catch {
    // Missing env: still send the user home.
  }
  return response;
}
