import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!token || !url || !secret || !publishable || admins.length === 0) return null;
  const response = await fetch(url.replace(/\/$/, "") + "/auth/v1/user", {
    headers: { apikey: publishable, Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!response.ok) return null;
  const user = await response.json();
  if (typeof user.email !== "string" || !admins.includes(user.email.toLowerCase())) return null;
  return { url: url.replace(/\/$/, ""), secret };
}

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function ascii(value: unknown) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
}
function pdfText(value: unknown) {
  return ascii(value).split("\\").join("\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
function money(value: number) { return `BND $${value.toFixed(2)}`; }

function makePdf(month: string, rows: any[], totalPax: number, revenue: number) {
  const pageRows = 34;
  const pages = Math.max(1, Math.ceil(rows.length / pageRows));
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const fontId = 3;
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  for (let p = 0; p < pages; p++) {
    const pageId = 4 + p * 2;
    const contentId = pageId + 1;
    pageObjectIds.push(pageId);
    const lines: string[] = [];
    const draw = (x:number,y:number,size:number,text:string,bold=false) => {
      lines.push(`BT /${bold ? "F1" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`);
    };
    lines.push("0.03 0.31 0.20 rg 40 790 515 1 re f");
    draw(40, 810, 18, "NASI KATOK 3 ABDUL - INVOICE BULANAN", true);
    draw(40, 770, 11, `Bulan: ${month}     Status dikira: Accepted, Preparing, Ready, Completed`);
    draw(40, 748, 11, `Jumlah pesanan: ${rows.length}     Total Pax: ${totalPax}     Jumlah hasil: ${money(revenue)}`);
    lines.push("0.03 0.31 0.20 rg 40 730 515 1 re f");
    draw(42, 710, 9, "NO. PESANAN", true);
    draw(145, 710, 9, "TARIKH", true);
    draw(215, 710, 9, "PELANGGAN / CAWANGAN", true);
    draw(440, 710, 9, "PAX", true);
    draw(485, 710, 9, "JUMLAH", true);
    let y = 690;
    for (const row of rows.slice(p*pageRows, (p+1)*pageRows)) {
      const pax = (row.order_items || []).reduce((sum:number, item:any) => sum + Number(item.quantity || 0), 0);
      draw(42,y,8,row.order_number);
      draw(145,y,8,new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Brunei", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(row.created_at)));
      draw(215,y,8,`${ascii(row.customer_name).slice(0,22)} / ${row.branch}`);
      draw(445,y,8,String(pax));
      draw(485,y,8,money(Number(row.total || 0)));
      y -= 17;
      lines.push("0.88 0.90 0.87 RG 40 " + (y+10) + " 515 0.5 re S");
    }
    draw(500, 25, 8, `Halaman ${p+1}/${pages}`);
    const stream = lines.join("\n");
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  }
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, "ascii");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10,"0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth) return error("Akses admin tidak dibenarkan. Sila log masuk semula.", 401);
  const params = new URL(request.url).searchParams;
  const month = params.get("month") || "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return error("Bulan invoice tidak sah.", 400);
  const start = new Date(`${month}-01T00:00:00+08:00`);
  const [year, mon] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, mon, 1) - 8 * 60 * 60 * 1000);
  const query = new URLSearchParams({
    select: "id,order_number,customer_name,branch,total,status,created_at,order_items(quantity)",
    order: "created_at.asc",
    limit: "1000",
    status: "in.(accepted,preparing,ready,completed)",
  });
  const allRows: any[] = [];
  let offset = 0;
  while (true) {
    query.set("offset", String(offset));
    const pageQuery = new URLSearchParams(query);
    pageQuery.set("and", `(created_at.gte.${start.toISOString()},created_at.lt.${end.toISOString()})`);
    const response = await fetch(`${auth.url}/rest/v1/orders?${pageQuery.toString()}`, {
      headers: { apikey: auth.secret, Authorization: `Bearer ${auth.secret}` }, cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data)) {
      console.error("Monthly invoice query failed:", response.status, data);
      return error("Tidak dapat memuatkan rekod invoice bulanan.", 502);
    }
    allRows.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  const totalPax = allRows.reduce((sum, row) => sum + (row.order_items || []).reduce((n:number,item:any)=>n+Number(item.quantity||0),0), 0);
  const revenue = Math.round(allRows.reduce((sum,row)=>sum+Number(row.total||0),0)*100)/100;
  if (params.get("format") === "pdf") {
    const pdf = makePdf(month, allRows, totalPax, revenue);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="NK3A-Invoice-${month}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json({ ok:true, month, totalOrders:allRows.length, totalPax, revenue });
}
