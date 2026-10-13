"use client";

import { useMemo, useState } from "react";

type OrderLine = { id: number; sambals: string[]; quantity: number };

const SAMBALS = [
  "Biasa",
  "Tahai Biasa",
  "Pusu Biasa",
  "Udang Biasa",
  "Pedas Manis",
  "Padas Padas",
  "Lada Padi",
];

const money = (amount: number) => `$${amount.toFixed(2)}`;
const linePrice = (sambals: string[]) => (sambals.length === 3 ? 1.5 : sambals.length > 0 ? 1 : 0);

export default function Home() {
  const [branch, setBranch] = useState("Rimba");
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" }));
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [stage, setStage] = useState<"order" | "addons" | "review" | "done">("order");
  const [chicken, setChicken] = useState(0);
  const [whiteRice, setWhiteRice] = useState(0);
  const [extraType, setExtraType] = useState("Biasa");
  const [extraPrice, setExtraPrice] = useState(0.5);
  const [extraQty, setExtraQty] = useState(0);
  const [message, setMessage] = useState("");

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + linePrice(line.sambals) * line.quantity, 0),
    [lines]
  );
  const addonTotal = chicken * 1 + whiteRice * 0.5 + extraQty * extraPrice;
  const total = subtotal + addonTotal;

  function toggleSambal(sambal: string) {
    setMessage("");
    setSelected((current) => {
      if (current.includes(sambal)) return current.filter((item) => item !== sambal);
      if (current.length >= 3) {
        setMessage("Pilih maksimum 3 jenis sambal.");
        return current;
      }
      return [...current, sambal];
    });
  }

  function addLine() {
    if (selected.length < 1) {
      setMessage("Pilih sekurang-kurangnya satu jenis sambal.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setMessage("Masukkan kuantiti antara 1 hingga 100.");
      return;
    }
    setLines((current) => [...current, { id: Date.now(), sambals: [...selected], quantity }]);
    setSelected([]);
    setQuantity(1);
    setMessage("Pesanan ditambah.");
  }

  function continueTo(next: "addons" | "review") {
    if (!name.trim()) {
      setMessage("Sila masukkan nama pelanggan.");
      setStage("order");
      return;
    }
    if (!date || !time) {
      setMessage("Sila pilih tarikh dan waktu ambil.");
      setStage("order");
      return;
    }
    if (lines.length === 0) {
      setMessage("Sila tambah sekurang-kurangnya satu pesanan.");
      setStage("order");
      return;
    }
    setMessage("");
    setStage(next);
  }

  async function confirmOrder() {
    const payload = {
      branch,
      name: name.trim(),
      pickupDate: date,
      pickupTime: time,
      lines,
      addons: { chicken, whiteRice, extraSambal: { type: extraType, unitPrice: extraPrice, quantity: extraQty } },
      subtotal,
      addonTotal,
      total,
    };
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setMessage("Semakan selesai, tetapi pesanan belum dapat disimpan. Sila cuba lagi.");
        return;
      }
    } catch {
      setMessage("Pesanan belum dapat disimpan. Sila cuba lagi.");
      return;
    }
    setStage("done");
    setMessage("Pesanan disahkan.");
  }

  const times = Array.from({ length: 15 }, (_, index) => {
    const minutes = 10 * 60 + (index + 1) * 30;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }).filter((slot) => slot <= "17:00");

  return (
    <main className="container">
      <header className="hero">
        <h1>Nasi Katok 3 Abdul</h1>
        <p>Pilih menu dan waktu ambil.</p>
      </header>

      <section className="card">
        <h2>1. Maklumat pelanggan</h2>
        <label>Cawangan</label>
        <select value={branch} onChange={(event) => setBranch(event.target.value)}>
          <option>Rimba</option>
          <option>Telisai</option>
        </select>
        <label>Nama pelanggan</label>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama pelanggan" />
        <label>Tarikh ambil</label>
        <input type="date" value={date} min={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" })} onChange={(event) => { setDate(event.target.value); setTime(""); }} />
        <label>Waktu ambil</label>
        <select value={time} onChange={(event) => setTime(event.target.value)}>
          <option value="">Pilih waktu ambil</option>
          {times.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
        </select>
        <p className="muted">Waktu operasi: 10.00 pagi–5.00 petang. Tempahan perlu dibuat sekurang-kurangnya 30 minit lebih awal.</p>
      </section>

      {stage === "order" && <section className="card">
        <h2>2. Pilihan sambal</h2>
        <p className="muted">Pilih 1 hingga 3 jenis sambal bagi setiap pesanan.</p>
        <div className="menu-grid">
          {SAMBALS.map((sambal) => <label className="choice" key={sambal}>
            <input type="checkbox" checked={selected.includes(sambal)} onChange={() => toggleSambal(sambal)} />
            <span>{sambal}</span>
          </label>)}
        </div>
        <label>Kuantiti</label>
        <div className="quantity-row">
          <button type="button" className="secondary" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
          <input type="number" min={1} max={100} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} />
          <button type="button" className="secondary" disabled={quantity >= 100} onClick={() => setQuantity((value) => Math.min(100, value + 1))}>+</button>
        </div>
        <div className="summary-line"><span>Harga sebungkus</span><strong>{money(linePrice(selected))}</strong></div>
        <div className="summary-line"><span>Jumlah</span><strong>{money(linePrice(selected) * quantity)}</strong></div>
        <button type="button" className="primary" onClick={addLine}>＋ Tambah pesanan</button>
        <button type="button" className="secondary wide" onClick={() => continueTo("addons")}>Teruskan ke Add Ons</button>
        <button type="button" className="secondary wide" onClick={() => continueTo("review")}>Sahkan tanpa Add Ons</button>
      </section>}

      {lines.length > 0 && <section className="card">
        <h2>{stage === "order" ? "3. Pesanan anda" : "Ringkasan pesanan"}</h2>
        {lines.map((line, index) => <div className="order-line" key={line.id}>
          <div><span>{index + 1}. {line.sambals.join(" + ")} × {line.quantity}</span><strong>{money(linePrice(line.sambals) * line.quantity)}</strong></div>
          <button type="button" className="secondary" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>Buang</button>
        </div>)}
        <div className="summary-line total-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
      </section>}

      {stage === "addons" && <section className="card">
        <h2>3. Add Ons</h2>
        <p className="muted">Pilih tambahan jika perlu.</p>
        <div className="addon-row"><label>Ayam Goreng ({money(1)} seunit)</label><div className="quantity-row"><button type="button" className="secondary" disabled={chicken === 0} onClick={() => setChicken((v) => Math.max(0, v - 1))}>−</button><span>{chicken}</span><button type="button" className="secondary" onClick={() => setChicken((v) => Math.min(100, v + 1))}>+</button></div></div>
        <div className="addon-row"><label>Nasi Putih ({money(0.5)} seunit)</label><div className="quantity-row"><button type="button" className="secondary" disabled={whiteRice === 0} onClick={() => setWhiteRice((v) => Math.max(0, v - 1))}>−</button><span>{whiteRice}</span><button type="button" className="secondary" onClick={() => setWhiteRice((v) => Math.min(100, v + 1))}>+</button></div></div>
        <div className="addon-row"><label>Extra Sambal</label><select value={extraType} onChange={(event) => setExtraType(event.target.value)}>{SAMBALS.map((sambal) => <option key={sambal}>{sambal}</option>)}</select><label>Harga seunit</label><select value={extraPrice} onChange={(event) => setExtraPrice(Number(event.target.value))}>{Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5).map((price) => <option key={price} value={price}>{money(price)}</option>)}</select><div className="quantity-row"><button type="button" className="secondary" disabled={extraQty === 0} onClick={() => setExtraQty((v) => Math.max(0, v - 1))}>−</button><span>{extraQty}</span><button type="button" className="secondary" onClick={() => setExtraQty((v) => Math.min(100, v + 1))}>+</button></div></div>
        <div className="summary-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="summary-line"><span>Jumlah Add Ons</span><strong>{money(addonTotal)}</strong></div><div className="summary-line total-line"><span>Jumlah keseluruhan</span><strong>{money(total)}</strong></div>
        <button type="button" className="primary" onClick={() => setStage("review")}>Teruskan ke semakan</button>
        <button type="button" className="secondary wide" onClick={() => { setChicken(0); setWhiteRice(0); setExtraQty(0); setStage("review"); }}>Tiada Add Ons</button>
        <button type="button" className="secondary wide" onClick={() => setStage("order")}>Kembali ke pesanan</button>
      </section>}

      {stage === "review" && <section className="card">
        <h2>Semak pesanan</h2>
        <p><strong>Cawangan:</strong> {branch}</p><p><strong>Nama:</strong> {name}</p><p><strong>Tarikh ambil:</strong> {date}</p><p><strong>Waktu ambil:</strong> {time}</p>
        <p><strong>Subtotal:</strong> {money(subtotal)}</p><p><strong>Add Ons:</strong> {money(addonTotal)}</p><h2>Jumlah: {money(total)}</h2>
        <button type="button" className="primary" onClick={confirmOrder}>Sahkan pesanan</button>
        <button type="button" className="secondary wide" onClick={() => setStage("addons")}>Edit Add Ons</button>
        <button type="button" className="secondary wide" onClick={() => setStage("order")}>Edit pesanan</button>
      </section>}

      {stage === "done" && <section className="card"><h2>Pesanan disahkan</h2><p>Terima kasih, {name}. Sila hubungi cawangan untuk mengesahkan penerimaan pesanan.</p><p><strong>Jumlah:</strong> {money(total)}</p></section>}
      {message && <p className="notice" role="status">{message}</p>}
    </main>
  );
}
