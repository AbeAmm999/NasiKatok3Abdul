"use client";

import { useMemo, useState } from "react";

const SAMBALS = [
  "Biasa Manis",
  "Tahai Biasa",
  "Pusu Biasa",
  "Udang Biasa",
  "Pedas Manis",
  "Padas Padas",
  "Lada Padi",
];

type OrderLine = { id: number; sambals: string[]; quantity: number };

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function pricePerPack(sambals: string[]) {
  return sambals.length === 3 ? 1.5 : 1;
}

function getEarliestPickupDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Brunei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const hour = Number(part("hour"));
  const date = new Date(Date.UTC(year, month - 1, day + (hour >= 17 ? 1 : 0)));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export default function Home() {
  const earliestPickupDate = getEarliestPickupDate();
  const [branch, setBranch] = useState("Rimba");
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => getEarliestPickupDate());
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [stage, setStage] = useState<"order" | "addons" | "review" | "done">("order");
  const [message, setMessage] = useState("");
  const [chickenQuantity, setChickenQuantity] = useState(0);
  const [riceQuantity, setRiceQuantity] = useState(0);
  const [riceUnitPrice, setRiceUnitPrice] = useState("0.50");
  const [extraType, setExtraType] = useState("Tahai Biasa");
  const [extraPrice, setExtraPrice] = useState("0.50");

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * pricePerPack(line.sambals), 0),
    [lines]
  );
  const addonTotal = chickenQuantity + riceQuantity * Number(riceUnitPrice) + Number(extraPrice);
  const total = subtotal + addonTotal;

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let mins = 10 * 60; mins <= 16 * 60 + 30; mins += 30) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const suffix = hour < 12 ? "pagi" : "petang";
      const displayHour = hour % 12 || 12;
      slots.push(`${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`);
    }
    return slots;
  }, []);

  function toggleSambal(sambal: string) {
    setMessage("");
    setSelected((current) => {
      if (current.includes(sambal)) return current.filter((item) => item !== sambal);
      if (current.length >= 3) {
        setMessage("Pilih maksimum 3 jenis sambal bagi setiap pesanan.");
        return current;
      }
      return [...current, sambal];
    });
  }

  function addLine() {
    if (selected.length < 1 || selected.length > 3) {
      setMessage("Sila pilih 1 hingga 3 jenis sambal.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setMessage("Masukkan kuantiti antara 1 hingga 100.");
      return;
    }
    setLines((current) => [
      ...current,
      { id: Date.now(), sambals: [...selected], quantity },
    ]);
    setSelected([]);
    setQuantity(1);
    setMessage("Pesanan ditambah.");
  }

  function continueTo(next: "addons" | "review") {
    if (!name.trim() || !time || !date) {
      setMessage("Sila isi nama, tarikh dan waktu ambil.");
      return;
    }
    if (lines.length === 0) {
      if (selected.length === 0) {
        setMessage("Sila pilih sambal dan tambah pesanan terlebih dahulu.");
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        setMessage("Masukkan kuantiti antara 1 hingga 100.");
        return;
      }
      setLines([{ id: Date.now(), sambals: [...selected], quantity }]);
      setSelected([]);
    }
    setMessage("");
    setStage(next);
  }

  function confirmOrder() {
    const orderLines = lines.map((line, index) =>
      `${index + 1}. ${line.sambals.join(" + ")} × ${line.quantity} — ${money(line.quantity * pricePerPack(line.sambals))}`
    );
    const addonLines = [
      ...(chickenQuantity > 0 ? [`Ayam Goreng × ${chickenQuantity} — ${money(chickenQuantity)}`] : []),
      ...(riceQuantity > 0 ? [`Nasi Putih × ${riceQuantity} (${money(Number(riceUnitPrice))}/unit) — ${money(riceQuantity * Number(riceUnitPrice))}`] : []),
      `Sambal tambahan: ${extraType} — ${money(Number(extraPrice))}`,
    ];
    const messageText = [
      "*PESANAN NASI KATOK 3 ABDUL*",
      "------------------------------",
      `Nama: ${name.trim()}`,
      `Cawangan: ${branch}`,
      `Tarikh ambil: ${date}`,
      `Waktu ambil: ${time}`,
      "",
      "*Senarai pesanan:*",
      ...orderLines,
      `Subtotal: ${money(subtotal)}`,
      "",
      "*Add On's:*",
      ...addonLines,
      `Jumlah Add On's: ${money(addonTotal)}`,
      "",
      `*JUMLAH KESELURUHAN: ${money(total)}*`,
      "------------------------------",
      "Pesanan dihantar melalui laman web.",
    ].join("\n");

    setMessage("Ringkasan pesanan disediakan. Hantar mesej melalui WhatsApp untuk melengkapkan pesanan.");
    setStage("done");
    const whatsappUrl = `https://wa.me/6738999443?text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  const buttonStyle: React.CSSProperties = {
    border: "1px solid #cbd5cf",
    borderRadius: 12,
    padding: "12px 10px",
    background: "#fff",
    color: "#173f30",
    fontWeight: 600,
    fontSize: 15,
    minHeight: 48,
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #cbd5cf",
    borderRadius: 12,
    padding: "12px",
    fontSize: 16,
    boxSizing: "border-box",
    background: "#fff",
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 16, color: "#1f2924" }}>
      <header style={{ background: "#154734", color: "#fff", borderRadius: 20, padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Nasi Katok 3 Abdul</h1>
        <p style={{ margin: "8px 0 0", fontSize: 17 }}>Sila isikan order biskita.</p>
      </header>

      <section style={{ background: "#fff", border: "1px solid #e1e5e2", borderRadius: 18, padding: 20, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>1. Maklumat pelanggan</h2>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Cawangan</label>
        <select style={inputStyle} value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option>Rimba</option>
          <option>Telisai</option>
        </select>

        <label style={{ display: "block", fontWeight: 600, margin: "14px 0 6px" }}>Nama pelanggan</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Masukkan nama" />

        <label style={{ display: "block", fontWeight: 600, margin: "14px 0 6px" }}>Tarikh ambil</label>
        <input style={inputStyle} type="date" min={earliestPickupDate} value={date} onChange={(e) => setDate(e.target.value)} />

        <label style={{ display: "block", fontWeight: 600, margin: "14px 0 6px" }}>Waktu ambil</label>
        <select style={inputStyle} value={time} onChange={(e) => setTime(e.target.value)}>
          <option value="">Pilih waktu ambil</option>
          {timeSlots.map((slot) => <option key={slot}>{slot}</option>)}
        </select>
        <p style={{ color: "#68756d", lineHeight: 1.5, marginBottom: 0 }}>
          Waktu ambil: 10:00 pagi–5:00 petang. Tempahan perlu dibuat sekurang-kurangnya 30 minit lebih awal.
        </p>
      </section>

      {stage === "order" && (
        <>
          <section style={{ background: "#fff", border: "1px solid #e1e5e2", borderRadius: 18, padding: 20, marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>2. Pilihan sambal</h2>
            <p style={{ marginTop: 0, color: "#4c5a52" }}>Pilih sehingga 3 jenis sambal bagi setiap pesanan.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {SAMBALS.map((sambal) => {
                const isSelected = selected.includes(sambal);
                return (
                  <button
                    key={sambal}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleSambal(sambal)}
                    style={{
                      ...buttonStyle,
                      padding: "12px 6px",
                      minHeight: 58,
                      border: isSelected ? "2px solid #176443" : "1px solid #d4dbd6",
                      background: isSelected ? "#24513f" : "#fff",
                      fontWeight: isSelected ? 700 : 500,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {sambal}
                  </button>
                );
              })}
            </div>

            <label style={{ display: "block", fontWeight: 700, margin: "18px 0 8px" }}>Kuantiti</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px minmax(0, 1fr) 48px", gap: 10, alignItems: "center", flex: "1 1 auto", minWidth: 0 }}>
                <button type="button" style={{ ...buttonStyle, minHeight: 44, padding: 8 }} disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <input
                  style={{ ...inputStyle, textAlign: "center", minHeight: 44 }}
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                />
                <button type="button" style={{ ...buttonStyle, minHeight: 44, padding: 8 }} disabled={quantity >= 100} onClick={() => setQuantity((q) => Math.min(100, q + 1))}>+</button>
              </div>
              <button type="button" onClick={addLine} style={{ ...buttonStyle, minHeight: 44, flex: "0 0 auto", padding: "10px 18px", background: "#176443", color: "#fff", borderColor: "#176443" }}>＋ Add</button>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span>Harga sebungkus</span><strong>{money(selected.length === 3 ? 1.5 : 1)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span>Jumlah</span><strong>{money(quantity * (selected.length === 3 ? 1.5 : 1))}</strong>
              </div>
            </div>

            <div style={{ marginTop: 18, borderTop: "1px solid #e6e9e7", paddingTop: 12 }}>
              <h3 style={{ margin: "0 0 3px", fontSize: 17 }}>Pesanan yang dipilih</h3>
              {lines.length === 0 ? <p style={{ margin: "8px 0", color: "#68756d" }}>Belum ada pesanan.</p> : lines.map((line, index) => (
                <div key={line.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0", fontSize: 13, lineHeight: 1.05 }}>
                  <span style={{ flex: "1 1 auto", minWidth: 0, overflowWrap: "anywhere" }}>
                    {index + 1}. {line.sambals.join(" + ")}
                  </span>
                  <span style={{ flex: "0 0 30px", textAlign: "center", whiteSpace: "nowrap" }}>
                    {line.quantity}
                  </span>
                  <strong style={{ flex: "0 0 54px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {money(line.quantity * pricePerPack(line.sambals))}
                  </strong>
                  <button
                    type="button"
                    aria-label={`Hapus pesanan ${line.sambals.join(" + ")}`}
                    title="Hapus pesanan"
                    onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                    style={{ flex: "0 0 22px", width: 22, height: 22, minHeight: 22, padding: 0, border: "1px solid #e1e5e2", borderRadius: 5, background: "#fff", color: "#a33a32", fontSize: 12, lineHeight: 1, cursor: "pointer" }}
                  >🗑️</button>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 15 }}>
                <strong>Subtotal</strong><strong>{money(subtotal)}</strong>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => continueTo("addons")} style={{ ...buttonStyle, flex: "1 1 0", minWidth: 0, padding: "12px 8px" }}>Add On's</button>
              <button type="button" onClick={() => continueTo("review")} style={{ ...buttonStyle, flex: "1 1 0", minWidth: 0, padding: "12px 8px", background: "#176443", color: "#fff", borderColor: "#176443" }}>Confirm Order!</button>
            </div>
            {message && <p role="status" style={{ marginBottom: 0, color: "#a33b2b" }}>{message}</p>}
          </section>
        </>
      )}

      {stage === "addons" && (
        <section style={{ background: "#fff", border: "1px solid #e1e5e2", borderRadius: 18, padding: 16, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>3. Add Ons</h2>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 84px", gap: 10, alignItems: "center", margin: "12px 0" }}>
            <label htmlFor="chickenQty">Ayam Goreng — $1.00 setiap satu</label>
            <input id="chickenQty" type="number" min={0} max={100} value={chickenQuantity} onChange={(e) => setChickenQuantity(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 100px 84px", gap: 8, alignItems: "center", margin: "12px 0" }}>
            <label htmlFor="riceQty">Nasi Putih</label>
            <select aria-label="Harga nasi putih" style={inputStyle} value={riceUnitPrice} onChange={(e) => setRiceUnitPrice(e.target.value)}><option value="0.50">$0.50</option><option value="1.00">$1.00</option></select>
            <input id="riceQty" aria-label="Kuantiti nasi putih" type="number" min={0} max={100} value={riceQuantity} onChange={(e) => setRiceQuantity(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} style={inputStyle} />
          </div>
          <div style={{ borderTop: "1px solid #e6e9e7", paddingTop: 12, marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Add On's (Sambal)</label>
            <select style={inputStyle} value={extraType} onChange={(e) => setExtraType(e.target.value)}>{SAMBALS.map((item) => <option key={item}>{item}</option>)}</select>
            <label style={{ display: "block", margin: "10px 0 6px", fontWeight: 600 }}>Harga sambal tambahan</label>
            <select style={inputStyle} value={extraPrice} onChange={(e) => setExtraPrice(e.target.value)}>{Array.from({ length: 10 }, (_, i) => ((i + 1) * 0.5).toFixed(2)).map((price) => <option key={price} value={price}>{money(Number(price))}</option>)}</select>
            <p style={{ color: "#68756d", fontSize: 13, marginBottom: 0 }}>Sambal tambahan menggunakan harga sahaja, tanpa kuantiti.</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}><strong>Jumlah Add Ons</strong><strong>{money(addonTotal)}</strong></div>
          <button type="button" onClick={() => setStage("review")} style={{ ...buttonStyle, width: "100%", marginTop: 14, background: "#176443", color: "#fff" }}>Semak pesanan</button>
        </section>
      )}

      {stage === "review" && (
        <section style={{ background: "#fff", border: "1px solid #e1e5e2", borderRadius: 18, padding: 20, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Semak pesanan</h2>
          <p><strong>Nama:</strong> {name}</p>
          <p><strong>Cawangan:</strong> {branch}</p>
          <p><strong>Tarikh dan waktu:</strong> {date} · {time}</p>
          <h3>Pesanan</h3>
          {lines.map((line, index) => <p key={line.id}>{index + 1}. {line.sambals.join(" + ")} × {line.quantity} — {money(line.quantity * pricePerPack(line.sambals))}</p>)}
          <p><strong>Subtotal:</strong> {money(subtotal)}</p>
          <p><strong>Add Ons:</strong> {money(addonTotal)}</p>
          <h2 style={{ display: "flex", justifyContent: "space-between" }}><span>Jumlah</span><span>{money(total)}</span></h2>
          <button type="button" onClick={() => setStage("order")} style={{ ...buttonStyle, width: "100%", marginBottom: 10 }}>Kembali edit</button>
          <button type="button" onClick={confirmOrder} style={{ ...buttonStyle, width: "100%", background: "#176443", color: "#fff" }}>Sahkan pesanan</button>
        </section>
      )}

      {stage === "done" && (
        <section style={{ background: "#fff", border: "1px solid #e1e5e2", borderRadius: 18, padding: 20, marginTop: 16 }}>
          <h2>Ringkasan pesanan</h2>
          <p>{message}</p>
          <p><strong>{name}</strong> · {branch}</p>
          <p>{date} · {time}</p>
          {lines.map((line, index) => <p key={line.id}>{index + 1}. {line.sambals.join(" + ")} × {line.quantity} — {money(line.quantity * pricePerPack(line.sambals))}</p>)}
          <h2 style={{ display: "flex", justifyContent: "space-between" }}><span>Jumlah</span><span>{money(total)}</span></h2>
        </section>
      )}
    </main>
  );
}
