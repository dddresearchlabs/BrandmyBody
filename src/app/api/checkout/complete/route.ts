import { completePaidSession } from "@/lib/record-bid";
import { publicError } from "@/lib/public-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sessionId =
    body && typeof body === "object"
      ? String((body as { sessionId?: unknown }).sessionId ?? "").trim()
      : "";

  try {
    const result = await completePaidSession(sessionId);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: publicError(err, "Could not record bid") },
      { status: 503 },
    );
  }
}
