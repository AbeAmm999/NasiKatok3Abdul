import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStatuses = new Set(["pending", "accepted", "preparing", "ready", "completed", "rejected", "cancelled"]);

async function authorize(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!token || !url || !secret || !publishable || admins.length === 0) return null;

  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: publishable, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = await response.json();
  if (typeof user.email !== "string" || !admins.includes(user.email.toLowerCase())) return null;
  return { url: url.replace(/\/$/, ""), secret };
}

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth) return error("Akses admin tidak dibenarkan. Sila log masuk semula.", 401);

  const params = new URL(request.url).searchParams;
  const branch = params.get("branch") || "";
  const status = params.get("status") || "";
  const search = (params.get("search") || "").trim().slice(0, 80);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 50)));
  const query = new URLSearchParams({
    select: "id,order_number,customer_name,branch,pickup_date,pickup_time,status,subtotal,addon_total,total,special_notes,addons,created_at,updated_at,order_items(id,sambals,extra_sambals,quantity,unit_price,line_total)",
    order: "created_at.desc",
    limit: String(limit),
  });
  if (branch === "Rimba" || branch === "Telisai") query.set("branch", `eq.${branch}`);
  if (allowedStatuses.has(status)) query.set("status", `eq.${status}`);
  if (search) {
    const safe = search.replace(/[(),.%_]/g, "");
    query.set("or", `(order_number.ilike.*${safe}*,customer_name.ilike.*${safe}*)`);
  }

  const response = await fetch(`${auth.url}/rest/v1/orders?${query.toString()}`, {
    headers: { apikey: auth.secret, Authorization: `Bearer ${auth.secret}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("Admin orders query failed:", response.status, data);
    return error("Tidak dapat memuatkan pesanan.", 502);
  }
  return NextResponse.json({ ok: true, orders: data });
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if (!auth) return error("Akses admin tidak dibenarkan. Sila log masuk semula.", 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || !allowedStatuses.has(body.status)) {
    return error("Maklumat kemaskini tidak sah.", 400);
  }
  const response = await fetch(`${auth.url}/rest/v1/orders?id=eq.${body.id}&select=id,order_number,status`, {
    method: "PATCH",
    headers: {
      apikey: auth.secret,
      Authorization: `Bearer ${auth.secret}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: body.status }),
    cache: "no-store",
  });
  const rows = await response.json();
  if (!response.ok || !Array.isArray(rows) || !rows[0]) {
    console.error("Admin status update failed:", response.status, rows);
    return error("Status pesanan tidak berjaya dikemaskini.", 502);
  }
  return NextResponse.json({ ok: true, order: rows[0] });
}
