"use client";

import { useMemo, useState } from "react";

const SAMBALS = [
  "Biasa Manis",
  "Tahai Biasa",
  "Pusu Biasa",
  "Udang Biasa",
  "Padas Manis",
  "Padas Padas",
  "Lada Padi",
];

type OrderLine = {
  id: number;
  sambals: string[];
  quantity: number;
};

const money = (value: number) => `$${value.toFixed(2)}`;

function pricePerPack(sambals: string[]) {
  return 1 + Math.max(0, sambals.length - 2) * 0.5;
}

export default function Home() {
  const [branch, setBranch] = useState("Rimba");
  const [name, setName] = useState("");
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Brunei",
    })
  );
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [stage, setStage] = useState<
    "order" | "addons" | "review" | "done"
  >("order");
  const [message, setMessage] = useState("");
  const [chickenQuantity, setChickenQuantity] = useState(0);
  const [riceQuantity, setRiceQuantity] = useState(0);
  const [riceUnitPrice, setRiceUnitPrice] = useState("0.50");
  const [extraType, setExtraType] = useState("Tahai Biasa");
  const [extraPrice, setExtraPrice] = useState("0.50");
  const [extraSambalEnabled, setExtraSambalEnabled] = useState(false);

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + line.quantity * pricePerPack(line.sambals),
        0
      ),
    [lines]
  );

  const addonTotal =
    chickenQuantity +
    riceQuantity * Number(riceUnitPrice) +
    (extraSambalEnabled ? Number(extraPrice) : 0);

  const total = subtotal + addonTotal;

  const timeSlots = useMemo(() => {
    const slots: string[] = [];

    for (
      let mins = 10 * 60;
      mins <= 16 * 60 + 30;
      mins += 30
    ) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const suffix = hour < 12 ? "pagi" : "petang";
      const displayHour = hour % 12 || 12;

      slots.push(
        `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`
      );
    }

    return slots;
  }, []);

  function toggleSambal(sambal: string) {
    setMessage("");

    setSelected((current) => {
      if (current.includes(sambal)) {
        return current.filter((item) => item !== sambal);
      }

      if (current.length >= 7) {
        setMessage("Maksimum 7 jenis sambal boleh dipilih.");
        return current;
      }

      return [...current, sambal];
    });
  }

  function addLine() {
    if (selected.length < 1 || selected.length > 7) {
      setMessage("Sila pilih 1 hingga 7 jenis sambal.");
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      setMessage("Masukkan kuantiti antara 1 hingga 100.");
      return;
    }

    setLines((current) => [
      ...current,
      {
        id: Date.now(),
        sambals: [...selected],
        quantity,
      },
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
        setMessage("Sila pilih sambal dan tambah pesanan dahulu.");
        return;
      }

      setLines([
        {
          id: Date.now(),
          sambals: [...selected],
          quantity,
        },
      ]);

      setSelected([]);
    }

    setMessage("");
    setStage(next);
  }

  function confirmOrder() {
    const orderLines = lines.map(
      (line, index) =>
        `${index + 1}. ${line.sambals.join(" + ")} × ${line.quantity} — ${money(
          line.quantity * pricePerPack(line.sambals)
        )}`
    );

    const addonLines = [
      ...(chickenQuantity > 0
        ? [`Ayam Goreng × ${chickenQuantity} — ${money(chickenQuantity)}`]
        : []),
      ...(riceQuantity > 0
        ? [
            `Nasi Putih × ${riceQuantity} — ${money(
              riceQuantity * Number(riceUnitPrice)
            )}`,
          ]
        : []),
      ...(extraSambalEnabled
        ? [
            `Sambal ${extraType} — ${money(Number(extraPrice))}`,
          ]
        : []),
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
      ...(addonLines.length ? addonLines : ["Tiada"]),
      `Jumlah Add On's: ${money(addonTotal)}`,
      "",
      `*JUMLAH KESELURUHAN: ${money(total)}*`,
    ].join("\n");

    setMessage("Ringkasan pesanan disediakan.");
    setStage("done");

    const whatsappUrl =
      `https://wa.me/6738999443?text=${encodeURIComponent(messageText)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  const sectionTitleStyle: React.CSSProperties = {
    margin: "0 0 16px",
    padding: "12px 14px",
    borderRadius: 12,
    color: "#fff8e7",
    background: "linear-gradient(105deg, #003b24, #075537)",
    border: "1px solid #c9a441",
    fontSize: 20,
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid #d7c17b",
    borderRadius: 12,
    padding: "12px 10px",
    background: "#fff",
    color: "#123d2a",
    fontWeight: 600,
    fontSize: 15,
    minHeight: 46,
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #cbd5cf",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    boxSizing: "border-box",
    background: "#fff",
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e2d8b9",
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    boxShadow: "0 4px 14px rgba(0,59,36,.06)",
  };

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 12,
        color: "#173326",
        background: "#fff",
        minHeight: "100vh",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; }
        input, select, button { font: inherit; }
        button:focus-visible, input:focus-visible, select:focus-visible {
          outline: 3px solid #d5b24c;
          outline-offset: 2px;
        }
      `}</style>

      <header
        style={{
          overflow: "hidden",
          borderRadius: 16,
          border: "2px solid #c9a441",
          background: "#003b24",
          color: "#fff8e7",
          marginBottom: 16,
        }}
      >
        <img
          src="/nasikatok-banner.png"
          alt="Nasi Katok 3 Abdul"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
          }}
        />
        <div
          style={{
            padding: "12px",
            textAlign: "center",
            background: "#003b24",
            borderTop: "1px solid #c9a441",
          }}
        >
          <strong style={{ fontSize: 18 }}>
            NASI KATOK 3 ABDUL
          </strong>
          <p style={{ margin: "5px 0 0", color: "#f8e9b4" }}>
            Sila isikan order biskita.
          </p>
        </div>
      </header>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>📍 1. Maklumat pelanggan</h2>

        <label>Cawangan</label>
        <select
          style={inputStyle}
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          <option>Rimba</option>
          <option>Telisai</option>
        </select>

        <label style={{ display: "block", marginTop: 14 }}>
          Nama pelanggan
        </label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masukkan nama"
        />

        <label style={{ display: "block", marginTop: 14 }}>
          Tarikh ambil
        </label>
        <input
          style={inputStyle}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label style={{ display: "block", marginTop: 14 }}>
          Waktu ambil
        </label>
        <select
          style={inputStyle}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        >
          <option value="">Pilih waktu ambil</option>
          {timeSlots.map((slot) => (
            <option key={slot}>{slot}</option>
          ))}
        </select>

        <p style={{ color: "#68756d", lineHeight: 1.5 }}>
          Waktu ambil: 10:00 pagi–5:00 petang. Tempahan perlu dibuat
          sekurang-kurangnya 30 minit lebih awal.
        </p>
      </section>

      {stage === "order" && (
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>🌶️ 2. Pilihan sambal</h2>

          <div
            style={{
              background: "#fff8df",
              border: "1px solid #e4c46b",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            **Campuran sambal:** Pilih sehingga 7 jenis sambal.
            Harga sebungkus bermula $1.00 untuk 1–2 jenis sambal.
            Setiap jenis selepas pilihan kedua dikenakan tambahan $0.50.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >
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
                    padding: "10px 5px",
                    minHeight: 58,
                    border: isSelected
                      ? "2px solid #c9a441"
                      : "1px solid #d8d8d2",
                    background: isSelected ? "#075537" : "#fff",
                    color: isSelected ? "#fff8e7" : "#123d2a",
                  }}
                >
                  {sambal}
                </button>
              );
            })}
          </div>

          <p>
            Sambal dipilih: {selected.length}/7
          </p>

          <label style={{ display: "block", fontWeight: 700 }}>
            Kuantiti
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              style={buttonStyle}
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <input
              style={{ ...inputStyle, textAlign: "center" }}
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(1, Math.min(100, Number(e.target.value) || 1))
                )
              }
            />
            <button
              type="button"
              style={buttonStyle}
              disabled={quantity >= 100}
              onClick={() => setQuantity((q) => Math.min(100, q + 1))}
            >
              +
            </button>
            <button
              type="button"
              onClick={addLine}
              style={{
                ...buttonStyle,
                background: "#075537",
                color: "#fff8e7",
              }}
            >
              + Add
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Harga sebungkus</span>
              <strong>{money(pricePerPack(selected))}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Jumlah</span>
              <strong>{money(quantity * pricePerPack(selected))}</strong>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e6e9e7", marginTop: 18 }}>
            <h3>Pesanan yang dipilih</h3>
            {lines.length === 0 && <p>Belum ada pesanan.</p>}

            {lines.map((line, index) => (
              <div
                key={line.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ flex: 1 }}>
                  {index + 1}. {line.sambals.join(" + ")} × {line.quantity}
                  {" — "}
                  {money(line.quantity * pricePerPack(line.sambals))}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setLines((current) =>
                      current.filter((item) => item.id !== line.id)
                    )
                  }
                  aria-label="Hapus pesanan"
                >
                  🗑️
                </button>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Subtotal</strong>
              <strong>{money(subtotal)}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => continueTo("addons")}
              style={{ ...buttonStyle, flex: 1 }}
            >
              Add On&apos;s
            </button>
            <button
              type="button"
              onClick={() => continueTo("review")}
              style={{
                ...buttonStyle,
                flex: 1,
                background: "#075537",
                color: "#fff8e7",
              }}
            >
              Confirm Order!
            </button>
          </div>

          {message && <p role="status">{message}</p>}
        </section>
      )}

      {stage === "addons" && (
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>🛍️ 3. Add On&apos;s</h2>

          <label>Ayam Goreng — $1.00 setiap satu</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            max={100}
            value={chickenQuantity}
            onChange={(e) =>
              setChickenQuantity(
                Math.max(0, Math.min(100, Number(e.target.value) || 0))
              )
            }
          />

          <label style={{ display: "block", marginTop: 14 }}>
            Harga Nasi Putih
          </label>
          <select
            style={inputStyle}
            value={riceUnitPrice}
            onChange={(e) => setRiceUnitPrice(e.target.value)}
          >
            <option value="0
