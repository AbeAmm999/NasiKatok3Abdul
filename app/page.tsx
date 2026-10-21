
"use client";

import { useMemo, useState } from "react";

const SAMBALS = [
  { name: "Biasa Manis", image: "/images/sambal-biasa-manis.jpg" },
  { name: "Tahai Biasa", image: "/images/sambal-tahai.jpg" },
  { name: "Pusu Biasa", image: "/images/sambal-pusu.jpg" },
  { name: "Udang Biasa", image: "/images/sambal-udang.jpg" },
  { name: "Padas Manis", image: "/images/sambal-padas-manis.jpg" },
  { name: "Padas Padas", image: "/images/sambal-padas.jpg" },
  { name: "Lada Padi", image: "/images/sambal-lada-padi.jpg" },
];

const ADDONS = {
  chicken: {
    name: "Ayam Goreng",
    image: "/images/ayam-goreng.jpg",
    price: 1.0,
  },
  rice: {
    name: "Nasi Putih",
    image: "/images/nasi-putih.jpg",
  },
  sambal: {
    name: "Extra Sambal",
    image: "/images/extra-sambal.jpg",
  },
};

const BRANCHES = [
  {
    name: "Rimba",
    image: "/images/rimba.jpg",
    address: "Cawangan Rimba",
  },
  {
    name: "Telisai",
    image: "/images/telisai.jpg",
    address: "Cawangan Telisai",
  },
];

type OrderLine = {
  id: number;
  sambals: string[];
  quantity: number;
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function pricePerPack(sambals: string[]) {
  return sambals.length === 3 ? 1.5 : 1.0;
}

function todayBrunei() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Brunei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function currentBruneiMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Brunei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value ?? 0
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0
  );

  return hour * 60 + minute;
}

function displayDate(date: string) {
  if (!date) return "-";

  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const displayHour = hour % 12 || 12;
  const suffix = hour < 12 ? "pagi" : "petang";

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function QuantityControl({
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="quantity-control">
      <button
        type="button"
        aria-label="Kurangkan kuantiti"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>

      <input
        aria-label="Kuantiti"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;

          if (raw === "") {
            onChange(min);
            return;
          }

          const parsed = Number(raw);

          if (Number.isFinite(parsed)) {
            onChange(
              Math.max(min, Math.min(max, Math.floor(parsed)))
            );
          }
        }}
      />

      <button
        type="button"
        aria-label="Tambah kuantiti"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}

function FoodImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`food-image ${className}`}>
      {!failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="image-placeholder" aria-label={alt}>
          <span>🍽️</span>
          <small>{alt}</small>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [branch, setBranch] = useState("Rimba");
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayBrunei);
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

  const [extraType, setExtraType] = useState("Biasa Manis");
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
    chickenQuantity * ADDONS.chicken.price +
    riceQuantity * Number(riceUnitPrice) +
    (extraSambalEnabled ? Number(extraPrice) : 0);

  const total = subtotal + addonTotal;

  const timeSlots = useMemo(() => {
    const slots: { value: number; label: string }[] = [];

    const today = todayBrunei();
    const minimumTime =
      date === today ? currentBruneiMinutes() + 30 : 10 * 60;

    for (let mins = 10 * 60; mins <= 16 * 60 + 30; mins += 30) {
      if (mins >= minimumTime) {
        slots.push({
          value: mins,
          label: formatTime(mins),
        });
      }
    }

    return slots;
  }, [date]);

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    setTime("");
    setMessage("");
  }

  function toggleSambal(sambal: string) {
    setMessage("");

    setSelected((current) => {
      if (current.includes(sambal)) {
        return current.filter((item) => item !== sambal);
      }

      if (current.length >= 3) {
        setMessage("Maksimum 3 jenis sambal sahaja.");
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
      setMessage("Kuantiti mestilah antara 1 hingga 100.");
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
    setMessage("Pesanan berjaya ditambah.");
  }

  function continueTo(next: "addons" | "review") {
    if (!name.trim()) {
      setMessage("Sila masukkan nama pelanggan.");
      return;
    }

    if (!date || !time) {
      setMessage("Sila pilih tarikh dan waktu pengambilan.");
      return;
    }

    const pickupMinutes = timeSlots.find(
      (slot) => slot.label === time
    )?.value;

    if (pickupMinutes === undefined) {
      setMessage(
        "Waktu tersebut tidak tersedia. Sila pilih waktu pengambilan yang sah."
      );
      setTime("");
      return;
    }

    if (date === todayBrunei()) {
      if (pickupMinutes < currentBruneiMinutes() + 30) {
        setMessage(
          "Tempahan mesti dibuat sekurang-kurangnya 30 minit lebih awal."
        );
        setTime("");
        return;
      }
    }

    if (lines.length === 0) {
      if (selected.length < 1 || selected.length > 3) {
        setMessage("Sila pilih sambal dan tambah pesanan dahulu.");
        return;
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        setMessage("Kuantiti mestilah antara 1 hingga 100.");
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
        `${index + 1}. ${line.sambals.join(" + ")} × ${
          line.quantity
        } — ${money(line.quantity * pricePerPack(line.sambals))}`
    );

    const addonLines = [
      ...(chickenQuantity > 0
        ? [
            `Ayam Goreng × ${chickenQuantity} — ${money(
              chickenQuantity * ADDONS.chicken.price
            )}`,
          ]
        : []),

      ...(riceQuantity > 0
        ? [
            `Nasi Putih × ${riceQuantity} (${money(
              Number(riceUnitPrice)
            )}/unit) — ${money(
              riceQuantity * Number(riceUnitPrice)
            )}`,
          ]
        : []),

      ...(extraSambalEnabled
        ? [
            `Sambal ${extraType} — ${money(
              Number(extraPrice)
            )}`,
          ]
        : []),
    ];

    const messageText = [
      "*PESANAN NASI KATOK 3 ABDUL*",
      "--------------------------------",
      `Nama: ${name.trim()}`,
      `Cawangan: ${branch}`,
      `Tarikh ambil: ${displayDate(date)}`,
      `Waktu ambil: ${time}`,
      "",
      "*SENARAI PESANAN*",
      ...orderLines,
      "",
      `Subtotal nasi katok: ${money(subtotal)}`,
      "",
      "*ADD ON'S*",
      ...(addonLines.length > 0 ? addonLines : ["Tiada Add On's"]),
      `Jumlah Add On's: ${money(addonTotal)}`,
      "",
      `*JUMLAH KESELURUHAN: ${money(total)}*`,
      "--------------------------------",
      "Pesanan dihantar melalui laman web.",
    ].join("\n");

    setMessage("Sila hantar mesej WhatsApp untuk melengkapkan pesanan.");
    setStage("done");

    const whatsappUrl =
      `https://wa.me/6738999443?text=${encodeURIComponent(messageText)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  const sectionTitleStyle: React.CSSProperties = {
    margin: "0 0 16px",
    padding: "13px 15px",
    borderRadius: 12,
    color: "#fff8e7",
    background:
      "linear-gradient(110deg, #003b24, #075537, #003b24)",
    border: "1px solid #c9a441",
    fontSize: 19,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d8d2bd",
    borderRadius: 10,
    padding: "12px",
    fontSize: 16,
    background: "#fff",
    color: "#173326",
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid #c9a441",
    borderRadius: 10,
    padding: "12px 10px",
    background: "#fff",
    color: "#06452d",
    fontWeight: 700,
    fontSize: 14,
    minHeight: 46,
    cursor: "pointer",
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
    <main className="nk3-main">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f7f6ef;
          font-family: Arial, Helvetica, sans-serif;
        }

        button, input, select {
          font: inherit;
        }

        button:focus-visible,
        input:focus-visible,
        select:focus-visible {
          outline: 3px solid #d5b24c;
          outline-offset: 2px;
        }

        button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .nk3-main {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 12px;
          min-height: 100vh;
          color: #173326;
          background: #fffdf7;
        }

        .nk3-header {
          overflow: hidden;
          border: 2px solid #c9a441;
          border-radius: 17px;
          background: #003b24;
          color: #fff8e7;
          margin-bottom: 16px;
          box-shadow: 0 5px 18px rgba(0,59,36,.12);
        }

        .nk3-banner {
          display: block;
          width: 100%;
          max-height: 260px;
          object-fit: cover;
        }

        .nk3-header-title {
          padding: 14px 12px;
          text-align: center;
          background: linear-gradient(90deg, #003b24, #075537, #003b24);
          border-top: 1px solid #c9a441;
        }

        .nk3-header-title h1 {
          margin: 0;
          font-size: clamp(21px, 5vw, 29px);
          letter-spacing: .6px;
        }

        .nk3-header-title p {
          margin: 7px 0 0;
          color: #f8e9b4;
          font-size: 14px;
        }

        .nk3-section {
          background: #fff;
          border: 1px solid #e2d8b9;
          border-radius: 16px;
          padding: 16px;
          margin-top: 14px;
          box-shadow: 0 4px 14px rgba(0,59,36,.06);
        }

        .nk3-field {
          display: block;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .nk3-field-group {
          margin-top: 14px;
        }

        .nk3-help {
          color: #64736a;
          line-height: 1.5;
          font-size: 13px;
        }

        .nk3-notice {
          background: #fff8df;
          border: 1px solid #e4c46b;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 14px;
          line-height: 1.5;
          font-size: 13px;
        }

        .branch-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .branch-card {
          overflow: hidden;
          border: 2px solid #e2d8b9;
          border-radius: 12px;
          padding: 0;
          background: #fff;
          color: #173326;
          text-align: left;
          cursor: pointer;
        }

        .branch-card.selected {
          border-color: #c9a441;
          box-shadow: 0 0 0 2px rgba(201,164,65,.15);
        }

        .branch-card .food-image {
          height: 110px;
        }

        .branch-card-text {
          padding: 10px;
        }

        .branch-card-text strong {
          display: block;
          font-size: 15px;
        }

        .branch-card-text small {
          display: block;
          margin-top: 4px;
          color: #68756d;
          font-size: 11px;
        }

        .sambal-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
        }

        .sambal-card {
          overflow: hidden;
          border: 2px solid #e2d8b9;
          border-radius: 11px;
          background: #fff;
          color: #173326;
          padding: 0;
          cursor: pointer;
          min-width: 0;
          text-align: center;
        }

        .sambal-card.selected {
          border-color: #c9a441;
          background: #f2f7f1;
          box-shadow: 0 0 0 1px #c9a441;
        }

        .sambal-card .food-image {
          height: 76px;
        }

        .sambal-name {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 43px;
          padding: 5px 3px;
          font-size: 11px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .food-image {
          width: 100%;
          overflow: hidden;
          background: #f0eee4;
        }

        .food-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          color: #587061;
          background: linear-gradient(135deg, #f4f0df, #e4eadf);
          padding: 5px;
          text-align: center;
        }

        .image-placeholder span {
          font-size: 26px;
        }

        .image-placeholder small {
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        .quantity-control {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) 42px;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .quantity-control button {
          width: 42px;
          height: 42px;
          border: 1px solid #c9a441;
          border-radius: 9px;
          background: #075537;
          color: #fff8e7;
          font-size: 23px;
          font-weight: 700;
          cursor: pointer;
        }

        .quantity-control input {
          width: 100%;
          min-width: 0;
          height: 42px;
          border: 1px solid #d8d2bd;
          border-radius: 9px;
          background: #fff;
          color: #173326;
          text-align: center;
          font-size: 16px;
        }

        .addon-card {
          border: 1px solid #e2d8b9;
          border-radius: 13px;
          padding: 10px;
          margin-top: 12px;
          background: #fffef9;
        }

        .addon-top {
          display: grid;
          grid-template-columns: 95px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .addon-top .food-image {
          height: 100px;
          border-radius: 9px;
        }

        .addon-title {
          margin: 0 0 5px;
          font-size: 15px;
        }

        .addon-price {
          color: #075537;
          font-weight: 700;
          font-size: 13px;
        }

        .addon-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(110px, 145px);
          gap: 10px;
          align-items: center;
          margin-top: 12px;
        }

        .addon-select {
          width: 100%;
          border: 1px solid #d8d2bd;
          border-radius: 9px;
          background: #fff;
          padding: 10px;
          color: #173326;
        }

        .order-line {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 36px 65px 30px;
          align-items: center;
          gap: 5px;
          padding: 9px 0;
          border-bottom: 1px solid #eeeade;
          font-size: 12px;
        }

        .order-line-name {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .order-line-quantity {
          text-align: center;
        }

        .order-line-price {
          text-align: right;
          white-space: nowrap;
        }

        .delete-button {
          width: 28px;
          height: 28px;
          border: 1px solid #e5c8c4;
          border-radius: 7px;
          background: #fff;
          color: #a33a32;
          cursor: pointer;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 11px;
        }

        .action-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
          margin-top: 17px;
        }

        .primary-button {
          background: #075537 !important;
          color: #fff8e7 !important;
          border-color: #c9a441 !important;
        }

        .status-message {
          border-radius: 9px;
          background: #fff8df;
          color: #704b00;
          padding: 10px;
          font-size: 13px;
          line-height: 1.5;
          margin-top: 12px;
        }

        .review-addon {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 13px;
          margin: 9px 0;
        }

        @media (min-width: 760px) {
          .nk3-main {
            padding: 20px;
          }

          .nk3-content-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 14px;
            align-items: start;
          }

          .nk3-content-grid > .nk3-section {
            margin-top: 14px;
          }

          .sambal-card .food-image {
            height: 105px;
          }

          .sambal-name {
            font-size: 13px;
          }
        }

        @media (max-width: 370px) {
          .nk3-main {
            padding: 8px;
          }

          .nk3-section {
            padding: 11px;
          }

          .sambal-grid {
            gap: 6px;
          }

          .sambal-card .food-image {
            height: 60px;
          }

          .sambal-name {
            font-size: 10px;
          }

          .addon-top {
            grid-template-columns: 80px minmax(0, 1fr);
            gap: 9px;
          }

          .addon-top .food-image {
            height: 85px;
          }

          .addon-controls {
            grid-template-columns: minmax(0, 1fr) 125px;
            gap: 6px;
          }
        }
      `}</style>

      <header className="nk3-header">
        <FoodImage
          src="/nasi-katok-banner.png"
          alt="Nasi Katok 3 Abdul"
          className="nk3-banner"
        />

        <div className="nk3-header-title">
          <h1>NASI KATOK 3 ABDUL</h1>
          <p>Sila isikan order biskita.</p>
        </div>
      </header>

      <section className="nk3-section">
        <h2 style={sectionTitleStyle}>📍 1. Maklumat pelanggan</h2>

        <label className="nk3-field">Pilih cawangan</label>

        <div className="branch-grid">
          {BRANCHES.map((item) => (
            <button
              type="button"
              key={item.name}
              aria-pressed={branch === item.name}
              onClick={() => setBranch(item.name)}
              className={`branch-card ${
                branch === item.name ? "selected" : ""
              }`}
            >
              <FoodImage src={item.image} alt={item.name} />

              <div className="branch-card-text">
                <strong>
                  {branch === item.name ? "✓ " : ""}
                  {item.name}
                </strong>
                <small>{item.address}</small>
              </div>
            </button>
          ))}
        </div>

        <div className="nk3-field-group">
          <label htmlFor="customerName" className="nk3-field">
            Nama pelanggan
          </label>

          <input
            id="customerName"
            style={inputStyle}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Masukkan nama"
            maxLength={80}
          />
        </div>

        <div className="nk3-field-group">
          <label htmlFor="pickupDate" className="nk3-field">
            Tarikh ambil
          </label>

          <input
            id="pickupDate"
            style={inputStyle}
            type="date"
            min={todayBrunei()}
            value={date}
            onChange={(event) => handleDateChange(event.target.value)}
          />
        </div>

        <div className="nk3-field-group">
          <label htmlFor="pickupTime" className="nk3-field">
            Waktu ambil
          </label>

          <select
            id="pickupTime"
            style={inputStyle}
            value={time}
            onChange={(event) => {
              setTime(event.target.value);
              setMessage("");
            }}
          >
            <option value="">Pilih waktu ambil</option>

            {timeSlots.map((slot) => (
              <option key={slot.label} value={slot.label}>
                {slot.label}
              </option>
            ))}
          </select>

          <p className="nk3-help">
            Waktu operasi pengambilan: 10:00 pagi hingga 5:00 petang.
            Tempahan memerlukan sekurang-kurangnya 30 minit sebelum waktu
            pengambilan. Slot terakhir ialah 4:30 petang.
          </p>
        </div>
      </section>

      {stage === "order" && (
        <section className="nk3-section">
          <h2 style={sectionTitleStyle}>🌶️ 2. Pilihan sambal</h2>

          <div className="nk3-notice">
            <strong>Sambal Campur Hanya Boleh Pilih 2 jenis sahaja</strong>
            <p style={{ margin: "6px 0 0" }}>
              Maksimum 3 jenis sambal bagi setiap pesanan. Pilihan 3 jenis
              sambal dikenakan harga $1.50 sebungkus.
            </p>
          </div>

          <div className="sambal-grid">
            {SAMBALS.map((sambal) => {
              const isSelected = selected.includes(sambal.name);

              return (
                <button
                  type="button"
                  key={sambal.name}
                  aria-pressed={isSelected}
                  onClick={() => toggleSambal(sambal.name)}
                  className={`sambal-card ${
                    isSelected ? "selected" : ""
                  }`}
                >
                  <FoodImage src={sambal.image} alt={sambal.name} />

                  <span className="sambal-name">
                    {isSelected ? "✓ " : ""}
                    {sambal.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 18 }}>
            <label className="nk3-field">Kuantiti bungkus</label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <QuantityControl
                value={quantity}
                min={1}
                max={100}
                onChange={setQuantity}
              />

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  background: "#075537",
                  color: "#fff8e7",
                  minWidth: 85,
                }}
                onClick={addLine}
              >
                ＋ Add
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 12,
              borderRadius: 11,
              background: "#f4f5ed",
            }}
          >
            <div className="price-row">
              <span>Harga sebungkus</span>
              <strong>
                {money(pricePerPack(selected))}
              </strong>
            </div>

            <div className="price-row">
              <span>Jumlah pilihan semasa</span>
              <strong>
                {money(quantity * pricePerPack(selected))}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>
              Pesanan yang dipilih
            </h3>

            {lines.length === 0 ? (
              <p className="nk3-help">Belum ada pesanan.</p>
            ) : (
              lines.map((line, index) => (
                <div className="order-line" key={line.id}>
                  <span className="order-line-name">
                    {index + 1}. {line.sambals.join(" + ")}
                  </span>

                  <span className="order-line-quantity">
                    {line.quantity}
                  </span>

                  <strong className="order-line-price">
                    {money(
                      line.quantity * pricePerPack(line.sambals)
                    )}
                  </strong>

                  <button
                    type="button"
                    className="delete-button"
                    aria-label={`Hapus pesanan ${index + 1}`}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((item) => item.id !== line.id)
                      )
                    }
                  >
                    🗑
                  </button>
                </div>
              ))
            )}

            <div className="price-row">
              <strong>Subtotal</strong>
              <strong>{money(subtotal)}</strong>
            </div>
          </div>

          <div className="action-row">
            <button
              type="button"
              style={buttonStyle}
              onClick={() => continueTo("addons")}
            >
              Add On's
            </button>

            <button
              type="button"
              className="primary-button"
              style={buttonStyle}
              onClick={() => continueTo("review")}
            >
              Confirm Order!
            </button>
          </div>

          {message && (
            <p className="status-message" role="status">
              {message}
            </p>
          )}
        </section>
      )}

      {stage === "addons" && (
        <section className="nk3-section">
          <h2 style={sectionTitleStyle}>🛍️ 3. Add On's</h2>

          <div className="addon-card">
            <div className="addon-top">
              <FoodImage
                src={ADDONS.chicken.image}
                alt="Ayam Goreng"
              />

              <div>
                <h3 className="addon-title">Ayam Goreng</h3>
                <div className="addon-price">$1.00 setiap satu</div>
                <p className="nk3-help">
                  Tambah ayam goreng kepada pesanan biskita.
                </p>
              </div>
            </div>

            <div className="addon-controls">
              <strong>Kuantiti</strong>

              <QuantityControl
                value={chickenQuantity}
                min={0}
                max={100}
                onChange={setChickenQuantity}
              />
            </div>

            <div className="price-row">
              <span>Jumlah ayam</span>
              <strong>
                {money(chickenQuantity * ADDONS.chicken.price)}
              </strong>
            </div>
          </div>

          <div className="addon-card">
            <div className="addon-top">
              <FoodImage
                src={ADDONS.rice.image}
                alt="Nasi Putih"
              />

              <div>
                <h3 className="addon-title">Nasi Putih</h3>
                <div className="addon-price">Bermula $0.50</div>
                <p className="nk3-help">
                  Pilih harga dan kuantiti nasi putih.
                </p>
              </div>
            </div>

            <div className="addon-controls">
              <label htmlFor="ricePrice" className="nk3-field">
                Harga seunit
              </label>

              <select
                id="ricePrice"
                className="addon-select"
                value={riceUnitPrice}
                onChange={(event) =>
                  setRiceUnitPrice(event.target.value)
                }
              >
                <option value="0.50">$0.50</option>
                <option value="1.00">$1.00</option>
              </select>
            </div>

            <div className="addon-controls">
              <strong>Kuantiti</strong>

              <QuantityControl
                value={riceQuantity}
                min={0}
                max={100}
                onChange={setRiceQuantity}
              />
            </div>

            <div className="price-row">
              <span>Jumlah nasi putih</span>
              <strong>
                {money(riceQuantity * Number(riceUnitPrice))}
              </strong>
            </div>
          </div>

          <div className="addon-card">
            <div className="addon-top">
              <FoodImage
                src={ADDONS.sambal.image}
                alt="Extra Sambal"
              />

              <div>
                <h3 className="addon-title">Extra Sambal</h3>
                <div className="addon-price">$0.50 – $5.00</div>
                <p className="nk3-help">
                  Pilih jenis sambal dan harga tambahan.
                </p>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                gap: 9,
                alignItems: "center",
                marginTop: 14,
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={extraSambalEnabled}
                onChange={(event) =>
                  setExtraSambalEnabled(event.target.checked)
                }
              />

              Tambah Extra Sambal
            </label>

            <div className="nk3-field-group">
              <label htmlFor="extraType" className="nk3-field">
                Jenis sambal
              </label>

              <select
                id="extraType"
                className="addon-select"
                value={extraType}
                onChange={(event) => setExtraType(event.target.value)}
              >
                {SAMBALS.map((sambal) => (
                  <option key={sambal.name} value={sambal.name}>
                    {sambal.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="nk3-field-group">
              <label htmlFor="extraPrice" className="nk3-field">
                Harga Extra Sambal
              </label>

              <select
                id="extraPrice"
                className="addon-select"
                value={extraPrice}
                onChange={(event) => setExtraPrice(event.target.value)}
              >
                {Array.from({ length: 10 }, (_, index) => {
                  const price = ((index + 1) * 0.5).toFixed(2);

                  return (
                    <option key={price} value={price}>
                      {money(Number(price))}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="price-row">
              <span>Jumlah Extra Sambal</span>
              <strong>
                {extraSambalEnabled
                  ? money(Number(extraPrice))
                  : money(0)}
              </strong>
            </div>
          </div>

          <div className="nk3-notice" style={{ marginTop: 14 }}>
            <strong>No, Thanks!</strong>
            <p style={{ margin: "5px 0 0" }}>
              Tidak mahu Add On's? Tekan butang di bawah untuk terus
              menyemak pesanan.
            </p>

            <button
              type="button"
              style={{ ...buttonStyle, marginTop: 10, width: "100%" }}
              onClick={() => {
                setChickenQuantity(0);
                setRiceQuantity(0);
                setExtraSambalEnabled(false);
                setStage("review");
                setMessage("");
              }}
            >
              No, Thanks!
            </button>
          </div>

          <div className="price-row">
            <strong>Jumlah Add On's</strong>
            <strong>{money(addonTotal)}</strong>
          </div>

          <div className="price-row">
            <strong>Jumlah keseluruhan</strong>
            <strong>{money(total)}</strong>
          </div>

          <div className="action-row">
            <button
              type="button"
              style={buttonStyle}
              onClick={() => setStage("order")}
            >
              Kembali
            </button>

            <button
              type="button"
              style={buttonStyle}
              className="primary-button"
              onClick={() => {
                setStage("review");
                setMessage("");
              }}
            >
              Semak pesanan
            </button>
          </div>
        </section>
      )}

      {stage === "review" && (
        <section className="nk3-section">
          <h2 style={sectionTitleStyle}>📋 4. Semak pesanan</h2>

          <div className="price-row">
            <span>Nama pelanggan</span>
            <strong>{name.trim()}</strong>
          </div>

          <div className="price-row">
            <span>Cawangan</span>
            <strong>{branch}</strong>
          </div>

          <div className="price-row">
            <span>Tarikh ambil</span>
            <strong>{displayDate(date)}</strong>
          </div>

          <div className="price-row">
            <span>Waktu ambil</span>
            <strong>{time}</strong>
          </div>

          <h3 style={{ marginTop: 22 }}>Pesanan dipilih</h3>

          {lines.map((line, index) => (
            <div className="order-line" key={line.id}>
              <span className="order-line-name">
                {index + 1}. {line.sambals.join(" + ")}
              </span>

              <span className="order-line-quantity">
                {line.quantity}
              </span>

              <strong className="order-line-price">
                {money(
                  line.quantity * pricePerPack(line.sambals)
                )}
              </strong>

              <span />
            </div>
          ))}

          <div className="price-row">
            <span>Subtotal nasi katok</span>
            <strong>{money(subtotal)}</strong>
          </div>

          <h3 style={{ marginTop: 22 }}>Add On's</h3>

          {chickenQuantity > 0 && (
            <div className="review-addon">
              <span>Ayam Goreng × {chickenQuantity}</span>
              <strong>
                {money(chickenQuantity * ADDONS.chicken.price)}
              </strong>
            </div>
          )}

          {riceQuantity > 0 && (
            <div className="review-addon">
              <span>
                Nasi Putih × {riceQuantity} (
                {money(Number(riceUnitPrice))}/unit)
              </span>
              <strong>
                {money(riceQuantity * Number(riceUnitPrice))}
              </strong>
            </div>
          )}

          {extraSambalEnabled && (
            <div className="review-addon">
              <span>Sambal {extraType}</span>
              <strong>{money(Number(extraPrice))}</strong>
            </div>
          )}

          {chickenQuantity === 0 &&
            riceQuantity === 0 &&
            !extraSambalEnabled && (
              <p className="nk3-help">Tiada Add On's.</p>
            )}

          <div className="price-row">
            <span>Jumlah Add On's</span>
            <strong>{money(addonTotal)}</strong>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 15,
              borderRadius: 12,
              background: "#003b24",
              color: "#fff8e7",
              border: "1px solid #c9a441",
            }}
          >
            <div className="price-row" style={{ marginTop: 0 }}>
              <strong>JUMLAH KESELURUHAN</strong>
              <strong style={{ fontSize: 22 }}>{money(total)}</strong>
            </div>
          </div>

          <div className="action-row">
            <button
              type="button"
              style={buttonStyle}
              onClick={() => setStage("order")}
            >
              Kembali edit
            </button>

            <button
              type="button"
              style={buttonStyle}
              className="primary-button"
              onClick={confirmOrder}
            >
              Hantar WhatsApp
            </button>
          </div>

          {message && (
            <p className="status-message" role="status">
              {message}
            </p>
          )}
        </section>
      )}

      {stage === "done" && (
        <section className="nk3-section">
          <h2 style={sectionTitleStyle}>✅ Pesanan disediakan</h2>

          <p>{message}</p>

          <p>
            <strong>{name.trim()}</strong> · {branch}
          </p>

          <p>
            {displayDate(date)} · {time}
          </p>

          <div className="price-row">
            <strong>Jumlah keseluruhan</strong>
            <strong>{money(total)}</strong>
          </div>

          <p className="nk3-help">
            Jika WhatsApp tidak terbuka, kembali ke halaman semakan dan
            tekan Hantar WhatsApp sekali lagi.
          </p>

          <button
            type="button"
            style={{ ...buttonStyle, width: "100%" }}
            onClick={() => setStage("review")}
          >
            Kembali ke ringkasan
          </button>
        </section>
      )}
    </main>
  );
}
