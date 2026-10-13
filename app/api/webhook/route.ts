import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ error: "Webhook belum dikonfigurasi." }, { status: 403 });
}
export async function POST() {
  // Intentionally no-op until Meta app and webhook verification are configured.
  return NextResponse.json({ received: true, configured: false });
}
