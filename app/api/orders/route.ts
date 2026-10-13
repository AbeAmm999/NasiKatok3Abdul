import { NextResponse } from "next/server";

const sambals = ["Biasa", "Tahai Biasa", "Pusu Biasa", "Udang Biasa", "Pedas Manis", "Padas Padas", "Lada Padi"];
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!["Rimba", "Telisai"].includes(body.branch)) return NextResponse.json({ error: "Cawangan tidak sah." }, { status: 400 });
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80) return NextResponse.json({ error: "Nama pelanggan diperlukan." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.pickupDate) || typeof body.pickupTime !== "string") return NextResponse.json({ error: "Tarikh atau waktu ambil tidak sah." }, { status: 400 });
    if (!Array.isArray(body.lines) || body.lines.length < 1) return NextResponse.json({ error: "Sekurang-kurangnya satu baris pesanan diperlukan." }, { status: 400 });
    let subtotal = 0;
    for (const line of body.lines) {
      if (!Array.isArray(line.sambals) || line.sambals.length < 1 || line.sambals.length > 3 || !line.sambals.every((s: unknown) => sambals.includes(String(s)))) return NextResponse.json({ error: "Pilihan sambal tidak sah." }, { status: 400 });
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) return NextResponse.json({ error: "Kuantiti mestilah antara 1 hingga 100." }, { status: 400 });
      subtotal += line.quantity * (line.sambals.length === 3 ? 1.5 : 1);
    }
    // Starter only: persistent storage and WhatsApp delivery will be added in later steps.
    const orderId = `NK3-${Date.now()}`;
    return NextResponse.json({ ok: true, orderId, total: Number(subtotal.toFixed(2)), whatsappSent: false, message: "Pesanan percubaan diterima oleh API. Belum disimpan secara kekal dan belum dihantar ke WhatsApp." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Permintaan tidak dapat diproses." }, { status: 400 });
  }
}
