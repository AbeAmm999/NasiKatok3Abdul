import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ timezone: "Asia/Brunei", openingTime: "10:00", closingTime: "17:00", intervalMinutes: 30, minimumLeadMinutes: 30, note: "Starter configuration. Server-side real-time slot validation will be added before production." });
}
