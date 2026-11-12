import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMBALS = new Set([
  "Biasa Manis",
  "Tahai Biasa",
  "Pusu Biasa",
  "Udang Biasa",
  "Padas Manis",
  "Padas Padas",
]);
const NO_SAMBAL = "__NO_SAMBAL__";

type OrderLineInput = {
  sambals: unknown;
  extraSambals: unknown;
  quantity: unknown;
};

type AddonInput = {
  type: unknown;
  name: unknown;
  quantity: unknown;
  unitPrice: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00+08:00`);
  return !Number.isNaN(parsed.getTime()) &&
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Brunei", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed) === value;
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !secretKey) {
      console.error("Supabase order storage environment variables are missing.");
      return jsonError("Sistem pesanan belum dikonfigurasi. Sila hubungi pengusaha.", 503);
    }

    const baseUrl = supabaseUrl.replace(/\\/$/, "");
    const settingsResponse = await fetch(`${baseUrl}/rest/v1/website_settings?id=eq.true&select=settings`, {
      headers: { apikey: secretKey }, cache: "no-store",
    });
    const settingsRows = await settingsResponse.json();
    if (!settingsResponse.ok || !settingsRows?.[0]?.settings) return jsonError("Tetapan pesanan tidak dapat dimuatkan. Sila cuba sebentar lagi.", 503);
    const settings = settingsRows[0].settings;
    if (settings.siteEnabled === false || settings.orderingEnabled === false) return jsonError("Pesanan ditutup buat sementara waktu.", 403);
    const branchSettings = settings.branches || {};
    const sambalSettings = Array.isArray(settings.sambals) ? settings.sambals : [];
    const enabledSambals = new Set(sambalSettings.filter((item: any) => item.enabled).map((item: any) => item.name).filter((name: any) => typeof name === "string"));
    const basePackPrice = Number(settings.prices?.basePack ?? 1);
    const extraSambalPrice = Number(settings.prices?.extraSambal ?? 0.5);
    const chickenPrice = Number(settings.prices?.friedChicken ?? 1);
    const ricePrices = [Number(settings.prices?.riceSmall ?? 0.5), Number(settings.prices?.riceLarge ?? 1)];

    const body = await request.json();
    if (typeof body.customerName !== "string" || !body.customerName.trim() || body.customerName.trim().length > 80) {
      return jsonError("Nama pelanggan diperlukan.");
    }
    if (!["Rimba", "Telisai"].includes(body.branch)) return jsonError("Cawangan tidak sah.");
    if (branchSettings?.[body.branch]?.enabled === false) return jsonError("Cawangan ini tidak menerima pesanan buat masa ini.", 403);
    if (!isDate(body.pickupDate)) return jsonError("Tarikh pengambilan tidak sah.");
    if (typeof body.pickupTime !== "string" || body.pickupTime.length > 40 || !body.pickupTime.trim()) {
      return jsonError("Waktu pengambilan diperlukan.");
    }
    if (typeof body.specialNotes !== "string" || body.specialNotes.length > 1000) {
      return jsonError("Catatan terlalu panjang atau tidak sah.");
    }
    if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 100) {
      return jsonError("Senarai pesanan tidak sah.");
    }

    let subtotal = 0;
    const itemRows = [];
    for (const raw of body.lines as OrderLineInput[]) {
      if (!Array.isArray(raw.sambals) || raw.sambals.length < 1 || raw.sambals.length > 7) {
        return jsonError("Pilihan sambal tidak sah.");
      }
      const sambals = raw.sambals as string[];
      const noSambal = sambals.length === 1 && sambals[0] === NO_SAMBAL;
      if (!noSambal && (!sambals.every((item) => typeof item === "string" && (sambalSettings.length ? enabledSambals.has(item) : SAMBALS.has(item))) || new Set(sambals).size !== sambals.length)) {
        return jsonError("Pilihan sambal tidak sah.");
      }
      if (!Array.isArray(raw.extraSambals) || raw.extraSambals.length > 7) return jsonError("Extra Sambal tidak sah.");
      const extraSambals = raw.extraSambals as string[];
      if (noSambal && extraSambals.length > 0) return jsonError("Extra Sambal tidak sah.");
      if (!extraSambals.every((item) => sambals.includes(item)) || new Set(extraSambals).size !== extraSambals.length) {
        return jsonError("Extra Sambal tidak sah.");
      }
      if (!Number.isInteger(raw.quantity) || Number(raw.quantity) < 1 || Number(raw.quantity) > 100) {
        return jsonError("Kuantiti mestilah antara 1 hingga 100.");
      }
      const unitPrice = noSambal ? basePackPrice : basePackPrice + Math.max(0, sambals.length - 2) * extraSambalPrice + extraSambals.length * extraSambalPrice;
      const lineTotal = roundMoney(unitPrice * Number(raw.quantity));
      subtotal += lineTotal;
      itemRows.push({
        sambals,
        extra_sambals: extraSambals,
        quantity: Number(raw.quantity),
        unit_price: unitPrice,
        line_total: lineTotal,
      });
    }

    if (!Array.isArray(body.addons) || body.addons.length > 20) return jsonError("Add-on tidak sah.");
    let addonTotal = 0;
    const addons = [];
    for (const raw of body.addons as AddonInput[]) {
      if (!Number.isInteger(raw.quantity) || Number(raw.quantity) < 1 || Number(raw.quantity) > 100) {
        return jsonError("Kuantiti add-on tidak sah.");
      }
      const unitPrice = Number(raw.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100) return jsonError("Harga add-on tidak sah.");
      if (raw.type === "fried_chicken") {
        if (settings.addons?.friedChicken === false || raw.name !== "Ayam Goreng" || unitPrice !== chickenPrice) return jsonError("Harga ayam goreng tidak sah.");
      } else if (raw.type === "plain_rice") {
        if (settings.addons?.plainRice === false || raw.name !== "Nasi Putih" || !ricePrices.includes(unitPrice)) return jsonError("Harga nasi putih tidak sah.");
      } else if (raw.type === "separate_sambal") {
        if (settings.addons?.separateSambal === false || typeof raw.name !== "string" || !(sambalSettings.length ? enabledSambals.has(raw.name) : SAMBALS.has(raw.name)) || raw.name === "Lada Padi" || Number(raw.quantity) !== 1 || unitPrice < 0.5 || unitPrice > 5 || unitPrice % 0.5 !== 0) {
          return jsonError("Pilihan Extra Sambal tidak sah.");
        }
      } else {
        return jsonError("Jenis add-on tidak dikenali.");
      }
      addonTotal += unitPrice * Number(raw.quantity);
      addons.push({ type: raw.type, name: raw.name, quantity: Number(raw.quantity), unitPrice });
    }

    const orderPayload = {
      customer_name: body.customerName.trim(),
      branch: body.branch,
      pickup_date: body.pickupDate,
      pickup_time: body.pickupTime.trim(),
      status: "accepted",
      subtotal: roundMoney(subtotal),
      addon_total: roundMoney(addonTotal),
      total: roundMoney(subtotal + addonTotal),
      special_notes: body.specialNotes.trim() || null,
      addons,
    };

    const baseUrl = supabaseUrl.replace(/\/$/, "");
    const headers = {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    };
    const orderResponse = await fetch(`${baseUrl}/rest/v1/orders?select=id,order_number`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(orderPayload),
      cache: "no-store",
    });
    const createdOrders = await orderResponse.json();
    if (!orderResponse.ok || !Array.isArray(createdOrders) || !createdOrders[0]?.id) {
      console.error("Supabase order insert failed:", orderResponse.status, createdOrders);
      return jsonError("Pesanan gagal disimpan. Sila cuba lagi atau hubungi cawangan.", 502);
    }

    const createdOrder = createdOrders[0];
    const itemResponse = await fetch(`${baseUrl}/rest/v1/order_items`, {
      method: "POST",
      headers,
      body: JSON.stringify(itemRows.map((item) => ({ ...item, order_id: createdOrder.id }))),
      cache: "no-store",
    });
    if (!itemResponse.ok) {
      const detail = await itemResponse.text();
      console.error("Supabase order items insert failed:", itemResponse.status, detail);
      await fetch(`${baseUrl}/rest/v1/orders?id=eq.${createdOrder.id}`, {
        method: "DELETE",
        headers,
        cache: "no-store",
      }).catch(() => undefined);
      return jsonError("Butiran pesanan gagal disimpan. Sila cuba lagi.", 502);
    }

    return NextResponse.json({
      ok: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      total: orderPayload.total,
      status: "accepted",
    }, { status: 201 });
  } catch (error) {
    console.error("Order API error:", error);
    return jsonError("Permintaan pesanan tidak dapat diproses.", 400);
  }
}
