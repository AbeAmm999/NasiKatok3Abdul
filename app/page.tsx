"use client";

import { useMemo, useState } from "react";

const SAMBALS = [
  "Biasa",
  "Tahai Biasa",
  "Pusu Biasa",
  "Udang Biasa",
  "Pedas Manis",
  "Padas Padas",
  "Lada Padi",
] as const;

type Sambal = (typeof SAMBALS)[number];
type OrderLine = {
  id: number;
  sambals: Sambal[];
  quantity: number;
};
type AddOn = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

const money = (amount: number) => `$${amount.toFixed(2)}`;

function sambalUnitPrice(sambals: Sambal[]) {
  return sambals.length === 3 ? 1.5 : sambals.length > 0 ? 1 : 0;
}

export default function Home() {
  const [branch, setBranch] = useState<"Rimba" | "Telisai">("Rimba");
  const [name, setName] = useState("");
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" })
  );
  const [time, setTime] = useState("");
  const [selectedSambals, setSelectedSambals] = useState<Sambal[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [stage, setStage] = useState<"order" | "addons" | "review" | "done">("order");
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [extraType, setExtraType] = useState<Sambal>("Biasa");
  const [extraPrice, setExtraPrice] = useState(0.5);
  const [message, setMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const slots = useMemo(() => {
    const result: string[] = [];
    for (let minutes = 10 * 60; minutes <= 16 * 60 + 30; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      result.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
    return result;
  }, []);

  const lineTotal = (line: OrderLine) =>
    sambalUnitPrice(line.sambals) * line.quantity;
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const addonsTotal = addons.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = subtotal + addonsTotal;
  const currentUnitPrice = sambalUnitPrice(selectedSambals);

  function toggleSambal(sambal: Sambal) {
    setMessage("");
    setSelectedSambals((current) => {
      if (current.includes(sambal)) return current.filter((item) => item !== sambal);
      if (current.length >= 3) {
        setMessage("Pilih maksimum 3 jenis sambal bagi setiap pesanan.");
        return current;
      }
      return [...current, sambal];
    });
  }

  function addLine() {
    if (selectedSambals.length < 1) {
      setMessage("Sila pilih sekurang-kurangnya satu jenis sambal.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setMessage("Masukkan kuantiti antara 1 hingga 100.");
      return;
    }
    setLines((current) => [
      ...current,
      { id: Date.now(), sambals: [...selectedSambals], quantity },
    ]);
    setSelectedSambals([]);
    setQuantity(1);
    setMessage("Pesanan ditambah.");
  }

  function removeLine(id: number) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  function addAddon(name: string, unitPrice: number) {
    setAddons((current) => [
      ...current,
      { id: Date.now() + Math.random(), name, quantity: 1, unitPrice },
    ]);
    setMessage(`${name} ditambah.`);
  }

  function continueTo(next: "addons" | "review") {
    if (!name.trim()) {
      setMessage("Sila masukkan nama pelanggan.");
      return;
    }
    if (!date || !time) {
      setMessage("Sila pilih tarikh dan waktu ambil.");
      return;
    }
    if (lines.length === 0) {
      setMessage("Sila tambah sekurang-kurangnya satu pesanan.");
      return;
    }
    const pickup = new Date(`${date}T${time}:00+08:00`);
    const now = new Date();
    if (pickup.getTime() < now.getTime() + 30 * 60 * 1000) {
      setMessage("Waktu ambil mestilah sekurang-kurangnya 30 minit dari sekarang.");
      return;
    }
    if (time < "10:00" || time > "16:30") {
      setMessage("Waktu ambil ialah antara 10:00 pagi hingga 4:30 petang.");
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
      addons,
      subtotal,
      addonsTotal,
      total,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Pesanan belum dapat dihantar. Sila cuba lagi.");
        return;
      }
      setOrderNumber(data.orderNumber || `NK3A-${Date.now().toString().slice(-6)}`);
      setStage("done");
      setMessage("Pesanan diterima.");
    } catch {
      setMessage("Sambungan gagal. Pesanan belum disahkan. Sila cuba lagi.");
    }
  }

  return (
    <main className="container">
      <header className="hero">
        <h1>Nasi Katok 3 Abdul</h1>
        <p>Sila isikan order biskita.</p>
      </header>

      <p className="notice">
        Sila semak pilihan dan jumlah sebelum mengesahkan pesanan.
      </p>

      {stage !== "done" && (
        <section className="card">
          <h2>1. Maklumat pelanggan</h2>
          <label>
            Cawangan
            <select value={branch} onChange={(event) => setBranch(event.target.value as "Rimba" | "Telisai")}>
              <option value="Rimba">Rimba</option>
              <option value="Telisai">Telisai</option>
            </select>
          </label>
          <label>
            Nama pelanggan
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama pelanggan" maxLength={80} />
          </label>
          <div className="two-columns">
            <label>
              Tarikh ambil
              <input type="date" value={date} min={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" })} onChange={(event) => { setDate(event.target.value); setTime(""); }} />
            </label>
            <label>
              Waktu ambil
              <select value={time} onChange={(event) => setTime(event.target.value)}>
                <option value="">Pilih waktu</option>
                {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </label>
          </div>
          <p className="hint">Waktu ambil: 10:00 pagi–5:00 petang. Tempahan perlu dibuat sekurang-kurangnya 30 minit lebih awal.</p>
        </section>
      )}

      {stage === "order" && (
        <>
          <section className="card">
            <h2>2. Pilih sambal</h2>
            <p className="hint">Pilih 1 hingga 3 jenis sambal.</p>
            <div className="sambal-list">
              {SAMBALS.map((sambal) => {
                const isSelected = selectedSambals.includes(sambal);
                return (
                  <button
                    type="button"
                    key={sambal}
                    className={`sambal-option ${isSelected ? "selected" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => toggleSambal(sambal)}
                  >
                    {sambal}
                  </button>
                );
              })}
            </div>

            <label className="quantity-label">Kuantiti</label>
            <div className="quantity-row">
              <button type="button" className="quantity-button" aria-label="Kurangkan kuantiti" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
              <input className="quantity-input" aria-label="Kuantiti" type="number" min={1} max={100} step={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} />
              <button type="button" className="quantity-button" aria-label="Tambah kuantiti" disabled={quantity >= 100} onClick={() => setQuantity((value) => Math.min(100, value + 1))}>+</button>
            </div>

            <div className="summary-line"><span>Harga sebungkus</span><strong>{money(currentUnitPrice)}</strong></div>
            <div className="summary-line"><span>Jumlah</span><strong>{money(currentUnitPrice * quantity)}</strong></div>
            <button type="button" className="primary wide" onClick={addLine}>＋ Tambah pesanan</button>
            <button type="button" className="secondary wide" onClick={() => continueTo("addons")}>Teruskan ke Add Ons</button>
            <button type="button" className="secondary wide" onClick={() => continueTo("review")}>Sahkan tanpa Add Ons</button>
          </section>

          <section className="card">
            <h2>3. Pesanan anda</h2>
            {lines.length === 0 ? <p className="hint">Belum ada pesanan.</p> : lines.map((line, index) => (
              <div className="order-line" key={line.id}>
                <div><span>{index + 1}. {line.sambals.join(" + ")} × {line.quantity}</span><strong>{money(lineTotal(line))}</strong></div>
                <button type="button" className="secondary remove-button" onClick={() => removeLine(line.id)}>Buang</button>
              </div>
            ))}
            <div className="summary-line total-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          </section>
        </>
      )}

      {stage === "addons" && (
        <section className="card">
          <h2>3. Add Ons</h2>
          <p className="hint">Pilih tambahan jika diperlukan.</p>
          <div className="addon-row"><span>Ayam Goreng <strong>{money(1)}</strong></span><button type="button" className="secondary" onClick={() => addAddon("Ayam Goreng", 1)}>Tambah</button></div>
          <div className="addon-row"><span>Nasi Putih <strong>{money(0.5)}</strong></span><button type="button" className="secondary" onClick={() => addAddon("Nasi Putih", 0.5)}>Tambah</button></div>
          <div className="addon-custom">
            <label>Extra Sambal
              <select value={extraType} onChange={(event) => setExtraType(event.target.value as Sambal)}>{SAMBALS.map((sambal) => <option key={sambal}>{sambal}</option>)}</select>
            </label>
            <label>Harga
              <select value={extraPrice} onChange={(event) => setExtraPrice(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => (index + 1) * 0.5).map((price) => <option key={price} value={price}>{money(price)}</option>)}</select>
            </label>
            <button type="button" className="primary wide" onClick={() => addAddon(`Extra Sambal (${extraType})`, extraPrice)}>Tambah Extra Sambal</button>
          </div>
          {addons.map((item) => <div className="addon-row" key={item.id}><span>{item.name} × {item.quantity} — {money(item.unitPrice * item.quantity)}</span><button type="button" className="secondary" onClick={() => setAddons((current) => current.filter((addon) => addon.id !== item.id))}>Buang</button></div>)}
          <div className="summary-line"><span>Jumlah Add Ons</span><strong>{money(addonsTotal)}</strong></div>
          <button type="button" className="primary wide" onClick={() => { setMessage(""); setStage("review"); }}>Teruskan</button>
          <button type="button" className="secondary wide" onClick={() => { setAddons([]); setStage("review"); }}>Tiada Add Ons</button>
          <button type="button" className="text-button" onClick={() => setStage("order")}>Kembali ke pesanan</button>
        </section>
      )}

      {stage === "review" && (
        <section className="card">
          <h2>Semak pesanan</h2>
          <p><strong>Cawangan:</strong> {branch}</p>
          <p><strong>Nama:</strong> {name}</p>
          <p><strong>Tarikh ambil:</strong> {date}</p>
          <p><strong>Waktu ambil:</strong> {time}</p>
          <hr />
          {lines.map((line) => <div className="summary-line" key={line.id}><span>{line.sambals.join(" + ")} × {line.quantity}</span><strong>{money(lineTotal(line))}</strong></div>)}
          {addons.map((item) => <div className="summary-line" key={item.id}><span>{item.name} × {item.quantity}</span><strong>{money(item.unitPrice * item.quantity)}</strong></div>)}
          <div className="summary-line total-line"><span>Jumlah keseluruhan</span><strong>{money(total)}</strong></div>
          <button type="button" className="primary wide" onClick={confirmOrder}>Sahkan Pesanan</button>
          <button type="button" className="secondary wide" onClick={() => setStage("order")}>Kembali dan edit</button>
          <button type="button" className="text-button" onClick={() => { setLines([]); setAddons([]); setStage("order"); setMessage("Pesanan dibatalkan."); }}>Batalkan pesanan</button>
        </section>
      )}

      {stage === "done" && (
        <section className="card">
          <h2>Pesanan dihantar</h2>
          <p>Terima kasih, {name}. Sila simpan nombor rujukan ini.</p>
          <p><strong>No. rujukan:</strong> {orderNumber}</p>
          <p><strong>Cawangan:</strong> {branch}</p>
          <p><strong>Ambil:</strong> {date}, {time}</p>
          <div className="summary-line total-line"><span>Jumlah</span><strong>{money(total)}</strong></div>
          <p className="hint">Status ini bergantung pada sambungan API pesanan yang telah disediakan.</p>
          <button type="button" className="primary wide" onClick={() => window.location.reload()}>Pesanan baharu</button>
        </section>
      )}

      {message && <p className="status-message" role="status">{message}</p>}
      <footer>Terima kasih memilih Nasi Katok 3 Abdul.</footer>
    </main>
  );
}
