import { createUserClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
