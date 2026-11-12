"use client";

import { useEffect, useMemo, useState } from "react";

const NO_SAMBAL = "__NO_SAMBAL__";

const SAMBALS = [
  "Biasa Manis",
  "Tahai Biasa",
  "Pusu Biasa",
  "Udang Biasa",
  "Padas Manis",
  "Padas Padas",
  "Lada Padi",
];

type OrderLine = { id: number; sambals: string[]; extraSambals: string[]; quantity: number };

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function displaySambals(sambals: string[], extraSambals: string[], isEnglish: boolean) {
  if (sambals.includes(NO_SAMBAL)) return isEnglish ? "No sambal" : "Nasi Katok Tanpa Sambal";
  const main = sambals.join(" + ");
  if (extraSambals.length === 0) return main;
  const extras = extraSambals.map((item) => item).join(", ");
  return `${main} (${isEnglish ? "Extra Sambal" : "Extra Sambal"} ${extras})`;
}

function pricePerPack(sambals: string[], extraSambals: string[] = [], basePrice = 1, extraPrice = 0.5) {
  if (sambals.includes(NO_SAMBAL)) return basePrice;
  const mainCount = sambals.length;
  const mainPrice = basePrice + Math.max(0, mainCount - 2) * extraPrice;
  return mainPrice + extraSambals.length * extraPrice;
}

const imagePaths = {
  banner: "/nasi-katok-banner.jpg",
  rimba: "/images/rimba.jpg",
  telisai: "/images/telisai.jpg",
  chicken: "/images/ayam-goreng.jpg",
  rice: "/images/nasi-putih.jpg",
  sambal: "/images/extra-sambal.jpg",
};

function Photo({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

export default function Home() {
  const [language, setLanguage] = useState<"bm" | "en">("bm");
  const [branch, setBranch] = useState("Rimba");

  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/site-settings", { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Tetapan website tidak dapat dimuatkan.");
      if (active) {
        setSiteSettings(data.settings);
        if (data.settings?.branches?.Rimba?.enabled === false && data.settings?.branches?.Telisai?.enabled !== false) setBranch("Telisai");
        const preferred = data.settings?.language?.default === "en" ? "en" : "bm";
        const chosen = data.settings?.language?.[preferred] !== false ? preferred : (data.settings?.language?.bm !== false ? "bm" : "en");
        setLanguage(chosen);
      }
    }).catch(error => console.error("Website settings load failed:", error))
      .finally(() => { if (active) setSettingsLoaded(true); });
    return () => { active = false; };
  }, []);
  const [adminSessionActive, setAdminSessionActive] = useState(false);
  useEffect(() => {
    setAdminSessionActive(Boolean(sessionStorage.getItem("nk3_admin_access_token")));
  }, []);
  const isEnglish = language === "en";
  const availableSambals: string[] = (siteSettings?.sambals || SAMBALS.map(name => ({ name, enabled: name !== "Lada Padi" }))).filter((item: any) => item.enabled).map((item: any) => item.name);
  const activeImagePaths = { ...imagePaths, ...(siteSettings?.images || {}) };
  const basePackPrice = Number(siteSettings?.prices?.basePack ?? 1);
  const extraSambalUnitPrice = Number(siteSettings?.prices?.extraSambal ?? 0.5);
  const chickenUnitPrice = Number(siteSettings?.prices?.friedChicken ?? 1);
  const riceSmallPrice = Number(siteSettings?.prices?.riceSmall ?? 0.5);
  const riceLargePrice = Number(siteSettings?.prices?.riceLarge ?? 1);
  const calculatePackPrice = (sambals: string[], extras: string[] = []) => pricePerPack(sambals, extras, basePackPrice, extraSambalUnitPrice);
  const siteEnabled = siteSettings?.siteEnabled !== false;
  const orderingEnabled = siteSettings?.orderingEnabled !== false;
  const branchConfig = siteSettings?.branches || {};
  const branchWhatsApp = branchConfig?.[branch]?.whatsapp || (branch === "Telisai" ? "6737141084" : "6738999443");
  const showChickenAddon = siteSettings?.addons?.friedChicken !== false;
  const showRiceAddon = siteSettings?.addons?.plainRice !== false;
  const showSeparateSambalAddon = siteSettings?.addons?.separateSambal !== false;
  const tr = (bm: string, en: string) => isEnglish ? en : bm;
  const [name, setName] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [showPickupValidation, setShowPickupValidation] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const bruneiToday = (() => { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Brunei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00"; return `${get("year")}-${get("month")}-${get("day")}`; })();
  const tomorrowDate = (() => { const d = new Date(`${bruneiToday}T12:00:00+08:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const [todaySelected, setTodaySelected] = useState(false);
  const [bruneiClock, setBruneiClock] = useState(() => new Date());
  useEffect(() => {
    const updateClock = () => setBruneiClock(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const bruneiParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Brunei", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(bruneiClock);
  const bruneiWeekday = bruneiParts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const bruneiHour = Number(bruneiParts.find((part) => part.type === "hour")?.value ?? "0");
  const bruneiMinute = Number(bruneiParts.find((part) => part.type === "minute")?.value ?? "0");
  const bruneiHourMinute = bruneiHour * 60 + bruneiMinute;
  const rimbaOperatingHours: Record<string, { open: number; close: number } | null> = {
    Mon: { open: 570, close: 960 }, Tue: { open: 570, close: 960 },
    Wed: { open: 570, close: 960 }, Thu: { open: 570, close: 960 },
    Fri: { open: 570, close: 710 }, Sat: { open: 570, close: 960 },
    Sun: { open: 630, close: 810 },
  };
  const telisaiOperatingHours: Record<string, { open: number; close: number } | null> = {
    Mon: { open: 570, close: 1140 }, Tue: { open: 570, close: 1140 },
    Wed: { open: 570, close: 1140 }, Thu: { open: 570, close: 1140 },
    Fri: { open: 570, close: 1140 }, Sat: { open: 570, close: 1140 },
    Sun: null,
  };
  const fallbackOperatingHours = branch === "Telisai" ? telisaiOperatingHours : rimbaOperatingHours;
  const branchHoursSettings = siteSettings?.hours?.[branch];
  const toMinutes = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
  const operatingHours: Record<string, { open: number; close: number } | null> = branchHoursSettings
    ? Object.fromEntries(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => {
        const value = branchHoursSettings[day];
        return [day, Array.isArray(value) && value.length === 2 ? { open: toMinutes(value[0]), close: toMinutes(value[1]) } : null];
      }))
    : fallbackOperatingHours;
  const todayHours = operatingHours[bruneiWeekday] ?? null;
  // TODAY starts at 6:00 AM and closes 20 minutes before this branch's closing time.
  // Telisai is closed all day Sunday.
  const todayStartHour = Number(siteSettings?.orderRules?.todayStartHour ?? 6);
  const todayCloseBuffer = Number(siteSettings?.orderRules?.todayCloseBufferMinutes ?? 20);
  const todayButtonClosed = siteSettings?.orderRules?.todayEnabled === false || bruneiHourMinute < todayStartHour * 60 || !todayHours || bruneiHourMinute >= todayHours.close - todayCloseBuffer;
  const [date, setDate] = useState(tomorrowDate);
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedExtraSambals, setSelectedExtraSambals] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [stage, setStage] = useState<"order" | "addons" | "review" | "done">("order");
  const [message, setMessage] = useState("");
  const [chickenQuantity, setChickenQuantity] = useState(0);
  const [riceQuantity, setRiceQuantity] = useState(0);
  const [riceUnitPrice, setRiceUnitPrice] = useState("0.50");
  const [addonSambalEnabled, setAddonSambalEnabled] = useState(false);
  const [addonSambalType, setAddonSambalType] = useState("Tahai Biasa");
  const [addonSambalPrice, setAddonSambalPrice] = useState("0.50");
  useEffect(() => {
    if (siteSettings?.prices?.riceSmall != null) setRiceUnitPrice(String(siteSettings.prices.riceSmall));
    if (siteSettings?.prices?.extraSambal != null) setAddonSambalPrice(String(siteSettings.prices.extraSambal));
  }, [siteSettings]);
  useEffect(() => {
    if (siteSettings?.branches?.[branch]?.enabled === false) {
      const alternative = branch === "Rimba" ? "Telisai" : "Rimba";
      if (siteSettings?.branches?.[alternative]?.enabled !== false) { setBranch(alternative); setTime(""); }
    }
  }, [siteSettings, branch]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * calculatePackPrice(line.sambals, line.extraSambals), 0),
    [lines]
  );
  const addonTotal =
    chickenQuantity * chickenUnitPrice +
    riceQuantity * Number(riceUnitPrice) +
    (addonSambalEnabled ? Number(addonSambalPrice) : 0);
  const total = subtotal + addonTotal;

  const timeSlots = useMemo(() => {
    const selectedDate = todaySelected ? bruneiToday : date;
    // Parse at midday to avoid date shifts across time zones.
    const selectedWeekday = new Date(`${selectedDate}T12:00:00+08:00`).toLocaleDateString("en-US", {
      weekday: "short", timeZone: "Asia/Brunei",
    });
    const hours = operatingHours[selectedWeekday] ?? null;
    const slots: string[] = [];
    if (!hours) return slots;

    const isTodayOrder = todaySelected && selectedDate === bruneiToday;
    if (isTodayOrder) {
      // TODAY: first slot is exactly 30 minutes from the current Brunei time.
      // Keep 30-minute intervals from that exact minute, with 4:00 PM as the hard final cutoff.
      const earliestMinutes = bruneiHourMinute + Number(siteSettings?.orderRules?.todayLeadMinutes ?? 30);
      const lastAvailableMinutes = Math.min(hours.close, Number(siteSettings?.orderRules?.maxSameDayHour ?? 16) * 60);
      if (earliestMinutes > lastAvailableMinutes) return slots;

      const slotInterval = Math.max(5, Number(siteSettings?.orderRules?.slotIntervalMinutes ?? 30));
      for (let mins = earliestMinutes; mins <= lastAvailableMinutes; mins += slotInterval) {
        const hour = Math.floor(mins / 60);
        const minute = mins % 60;
        const suffix = isEnglish ? (hour < 12 ? "AM" : "PM") : (hour < 12 ? "pagi" : "petang");
        const displayHour = hour % 12 || 12;
        slots.push(`${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`);
      }

      // Always retain 4:00 PM as the final available pickup time when it is still valid.
      if (lastAvailableMinutes === 16 * 60 && !slots.includes(isEnglish ? "4:00 PM" : "4:00 petang")) {
        slots.push(isEnglish ? "4:00 PM" : "4:00 petang");
      }
      return slots;
    }

    // Advance-date orders keep the original branch operating-hour schedule.
    const slotInterval = Math.max(5, Number(siteSettings?.orderRules?.slotIntervalMinutes ?? 30));
    for (let mins = hours.open; mins <= hours.close; mins += slotInterval) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const suffix = isEnglish ? (hour < 12 ? "AM" : "PM") : (hour < 12 ? "pagi" : "petang");
      const displayHour = hour % 12 || 12;
      slots.push(`${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`);
    }
    return slots;
  }, [isEnglish, todaySelected, bruneiToday, date, bruneiHourMinute, branch, siteSettings]);

  useEffect(() => {
    // Clear a TODAY pickup time automatically if it is no longer available.
    if (todaySelected && time && !timeSlots.includes(time)) setTime("");
  }, [todaySelected, time, timeSlots]);

  if (settingsLoaded && siteSettings && !siteEnabled) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f8f7f0", color: "#173326", textAlign: "center", fontFamily: "Arial, sans-serif" }}><div><h1>NASI KATOK 3 ABDUL</h1><h2>{isEnglish ? "Website temporarily unavailable" : "Website Ditutup Sementara"}</h2><p>{isEnglish ? "Please check back later. Thank you." : "Sila datang semula sebentar lagi. Terima kasih."}</p></div></main>;
  }

  function toggleSambal(sambal: string) {
    setMessage("");
    if (sambal === NO_SAMBAL) {
      // No Sambal is a normal toggle: tap once to select, tap again to cancel.
      if (selected.includes(NO_SAMBAL)) {
        setSelected([]);
        setSelectedExtraSambals([]);
      } else {
        setSelected([NO_SAMBAL]);
        setSelectedExtraSambals([]);
      }
      return;
    }
    if (selected.includes(NO_SAMBAL)) {
      setSelected([sambal]);
      setSelectedExtraSambals([]);      return;
    }
    if (selected.includes(sambal)) {
      if (selectedExtraSambals.includes(sambal)) {
        setSelected((current) => current.filter((item) => item !== sambal));
        setSelectedExtraSambals((current) => current.filter((item) => item !== sambal));
      } else {
        setSelectedExtraSambals((current) => [...current, sambal]);
      }
      return;
    }
    if (selected.length >= availableSambals.length) {
      return;
    }
    setSelected((current) => [...current, sambal]);
  }

  function removeSelectedExtraSambal(index: number) {
    setSelectedExtraSambals((current) => current.filter((_, i) => i !== index));
  }

  function removeLineExtraSambal(lineId: number, extraIndex: number) {
    setLines((current) => current.map((line) => line.id === lineId
      ? { ...line, extraSambals: line.extraSambals.filter((_, i) => i !== extraIndex) }
      : line));
  }

  function addLine() {
    if (selected.length < 1) {
      setMessage(isEnglish ? "Please select at least 1 sambal type." : "Sila pilih sekurang-kurangnya 1 jenis sambal.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setMessage(isEnglish ? "Enter a quantity between 1 and 100." : "Masukkan kuantiti antara 1 hingga 100.");
      return;
    }
    const newLine: OrderLine = {
      id: Date.now(),
      sambals: [...selected],
      extraSambals: [...selectedExtraSambals],
      quantity,
    };
    setLines((current) => {
      const sameSelection = (line: OrderLine) =>
        [...line.sambals].sort().join("|") === [...newLine.sambals].sort().join("|") &&
        [...line.extraSambals].sort().join("|") === [...newLine.extraSambals].sort().join("|");
      const existing = current.find(sameSelection);
      if (!existing) return [...current, newLine];
      return current.map((line) =>
        line.id === existing.id ? { ...line, quantity: line.quantity + newLine.quantity } : line
      );
    });
    setSelected([]);
    setSelectedExtraSambals([]);
    setQuantity(1);
    setMessage(isEnglish ? "Order added." : "Pesanan ditambah.");
  }

  function continueTo(next: "addons" | "review") {
    // Add On's must remain accessible even before customer details or pickup time are completed.
    if (next === "addons") {
      if (lines.length === 0 && selected.length > 0 && Number.isInteger(quantity) && quantity >= 1 && quantity <= 100) {
        setLines([{ id: Date.now(), sambals: [...selected], extraSambals: [...selectedExtraSambals], quantity }]);
        setSelected([]);
        setSelectedExtraSambals([]);
      }
      setMessage("");
      setStage("addons");
      return;
    }
    if (!name.trim() || !time || (!todaySelected && !date)) {
      setMessage(isEnglish ? "Please enter your name, pickup date and pickup time." : "Sila isi nama, tarikh dan waktu ambil.");
      return;
    }
    if (lines.length === 0) {
      if (selected.length === 0) {
        setMessage(isEnglish ? "Please select sambal and add your order first." : "Sila pilih sambal dan tambah pesanan terlebih dahulu.");
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        setMessage(isEnglish ? "Enter a quantity between 1 and 100." : "Masukkan kuantiti antara 1 hingga 100.");
        return;
      }
      setLines([{ id: Date.now(), sambals: [...selected], extraSambals: [...selectedExtraSambals], quantity }]);
      setSelected([]);
      setSelectedExtraSambals([]);
    }
    setMessage("");
    setStage(next);
  }

  async function confirmOrder() {
    if (!name.trim() || !time || (!todaySelected && !date)) {
      setShowPickupValidation(true);
      setMessage(isEnglish ? "Please enter your name, pickup date and pickup time." : "Sila isi nama, tarikh dan waktu ambil.");
      return;
    }    setShowPickupValidation(false);    if (lines.length === 0) {      setMessage(isEnglish ? "Please add at least one sambal order before confirming." : "Sila tambah sekurang-kurangnya satu pesanan sambal sebelum mengesahkan.");      return;    }    if (selected.length > 0) {
      setMessage(isEnglish ? "Please press Add first to include your current sambal selection." : "Sila tekan Tambah dahulu untuk memasukkan pilihan sambal semasa.");
      return;
    }
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    const orderLines = lines.map(
      (line, index) =>
        `${index + 1}. ${displaySambals(line.sambals, line.extraSambals, isEnglish)} × ${line.quantity} — ${money(
          line.quantity * calculatePackPrice(line.sambals, line.extraSambals)
        )}`
    );
    const addonLines = [
      ...(chickenQuantity > 0
        ? [`${isEnglish ? "Fried chicken" : "Ayam Goreng"} × ${chickenQuantity} — ${money(chickenQuantity * chickenUnitPrice)}`]
        : []),
      ...(riceQuantity > 0
        ? [
            `${isEnglish ? "Plain rice" : "Nasi Putih"} × ${riceQuantity} (${money(Number(riceUnitPrice))}/${isEnglish ? "unit" : "unit"}) — ${money(
              riceQuantity * Number(riceUnitPrice)
            )}`,
          ]
        : []),
      ...(addonSambalEnabled
        ? [`${isEnglish ? "Extra Sambal (separate, not mixed into the nasi katok)" : "Extra Sambal (asing, tidak dicampur pada nasi katok)"} — ${addonSambalType} — ${money(Number(addonSambalPrice))}`]
        : []),
    ];
    const pickupDate = todaySelected ? (isEnglish ? "Today" : "Hari Ini") : date;
    const messageText = [
      "*NEW ORDER NASI KATOK 3 ABDUL*",
      "----------------------------------------",
      "> Nama :",
      `- *${name.trim()}*`,
      "> Cawangan :",
      `- *${branch}*`,
      "> Tarikh ambil :",
      `- *${pickupDate}*`,
      "> Waktu ambil:",
      `- *${time}*`,
      "",
      "> Senarai pesanan :",
      ...orderLines.map((line) => `- *${line}*`),
      "",
      `*Subtotal: ${money(subtotal)}*`,
      ...(specialNotes.trim() ? ["", `*${isEnglish ? "Special Notes" : "Catatan Khas"}:*`, specialNotes.trim()] : []),
      ...(addonLines.filter(Boolean).length > 0
        ? [
            "",
            "*Add On's:*",
            ...addonLines.filter(Boolean).map((line) => `- *${line}*`),
            `*Jumlah Add On's: ${money(addonTotal)}*`,
          ]
        : []),
      "",
      "> JUMLAH KESELURUHAN:",
      `- *BND ${money(total)}*`,
      "------------------------------",
      "*Please Confirm This Order. Thank You!*",
    ].join("\n");

    const whatsappNumber = branchWhatsApp;
    const addons = [
      ...(chickenQuantity > 0 ? [{ type: "fried_chicken", name: "Ayam Goreng", quantity: chickenQuantity, unitPrice: chickenUnitPrice }] : []),
      ...(riceQuantity > 0 ? [{ type: "plain_rice", name: "Nasi Putih", quantity: riceQuantity, unitPrice: Number(riceUnitPrice) }] : []),
      ...(addonSambalEnabled ? [{ type: "separate_sambal", name: addonSambalType, quantity: 1, unitPrice: Number(addonSambalPrice) }] : []),
    ];

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          branch,
          pickupDate: todaySelected ? bruneiToday : date,
          pickupTime: time,
          specialNotes: specialNotes.trim(),
          lines: lines.map((line) => ({
            sambals: line.sambals,
            extraSambals: line.extraSambals,
            quantity: line.quantity,
          })),
          addons,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || (isEnglish ? "Unable to save your order. Please try again." : "Pesanan tidak dapat disimpan. Sila cuba lagi."));
      }
      const finalWhatsappText = `${messageText}\n\n*No. Pesanan: ${result.orderNumber}*`;
      const finalWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(finalWhatsappText)}`;
      setMessage(isEnglish
        ? `Order ${result.orderNumber} has been recorded. Please send the WhatsApp message to complete your request.`
        : `Pesanan ${result.orderNumber} telah direkodkan. Sila hantar mesej WhatsApp untuk melengkapkan permintaan anda.`);
      setStage("done");
      // Navigate the current tab directly to WhatsApp after the order is safely saved.
      // This avoids opening an about:blank tab while the API request is processing.
      window.location.assign(finalWhatsappUrl);
    } catch (error) {
      setIsSubmittingOrder(false);
      setMessage(error instanceof Error ? error.message : (isEnglish ? "Unable to save your order." : "Pesanan tidak dapat disimpan."));
    }
  }

  const sectionTitleStyle: React.CSSProperties = {
    margin: "0 0 16px",
    padding: "12px 14px",
    borderRadius: 12,
    color: "#fff8e7",
    background: "linear-gradient(105deg, #003b24, #075537)",
    border: "1px solid #c9a441",
    fontSize: 20,
    backgroundImage:
      "linear-gradient(105deg, rgba(0,59,36,.92), rgba(7,85,55,.92)), url('/images/floral-texture.jpg')",
  };

  const noticeStyle: React.CSSProperties = {
    background: "#fff8df",
    border: "1px solid #e4c46b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    color: "#173f30",
    lineHeight: 1.5,
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid #d7c17b",
    borderRadius: 12,
    padding: "12px 10px",
    background: "#fff",
    color: "#123d2a",
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

  return (    <main className="nk3-page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8f7f0; }
        input, select, button { font: inherit; }
        button:focus-visible, input:focus-visible, select:focus-visible {
          outline: 3px solid #d5b24c; outline-offset: 2px;
        }
        .nk3-page {
          max-width: 1100px; margin: 0 auto; padding: 12px;
          color: #173326; background: #fffefa; min-height: 100vh;
          font-family: Arial, Helvetica, sans-serif;
        }
        .nk3-language-admin-row{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.9fr) minmax(84px,.72fr);align-items:stretch;gap:8px;margin-bottom:8px;width:100%}
        .nk3-admin-access{display:flex;align-items:center;justify-content:center;min-width:0;min-height:42px;padding:8px 7px;border:1px solid #e8c75c;border-radius:12px;background:linear-gradient(135deg,#e8c75c,#c99b28);color:#173326;text-decoration:none;font-size:clamp(11px,2.8vw,15px);font-weight:800;letter-spacing:.4px;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}
        .nk3-admin-access:active{transform:translateY(1px)}
        .nk3-admin-disabled{font-family:inherit;cursor:not-allowed;opacity:.58;filter:saturate(.45);box-shadow:none}
        .nk3-banner {
          display: block; width: 100%; height: auto; max-height: 270px;
          object-fit: cover; background: #003b24;
        }
        .nk3-main-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
        .nk3-card {
          background: linear-gradient(rgba(255,254,250,.96), rgba(255,254,250,.96)), url('/images/floral-texture.jpg'); background-size: auto, 280px auto; border: 1px solid #c9a441; border-radius: 16px;
          padding: 14px; margin-top: 14px; box-shadow: 0 4px 14px rgba(0,59,36,.10);
          min-width: 0;
        }
        .nk3-branch-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .nk3-branch {
          border: 2px solid #e2d8b9; border-radius: 14px; overflow: hidden;
          background: #fff; padding: 0; color: #173326; cursor: pointer; min-width: 0;
        }
        .nk3-branch.selected { border-color: #087447; box-shadow: 0 0 0 2px rgba(8,116,71,.12); }
        .nk3-branch-photo { display: block; width: 100%; height: 112px; object-fit: cover; background: #eef0e7; }
        .nk3-branch-name { display: block; padding: 10px 6px; font-size: 16px; font-weight: 700; }
        .nk3-addon {
          display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 12px;
          align-items: center; border: 1px solid #eee7d5; border-radius: 14px;
          padding: 10px; margin: 10px 0; background: #fffefa;
        }
        .nk3-addon-photo {
          width: 76px; height: 76px; border-radius: 50%; object-fit: cover;
          border: 1px solid #e2d8b9; background: #f2f0e7;
        }
        .nk3-addon-content { min-width: 0; }
        .nk3-addon-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .nk3-qty { display: grid; grid-template-columns: 34px 46px 34px; align-items: center; gap: 0; }
        .nk3-qty button { min-height: 38px; padding: 4px; border: 1px solid #d6d6cf; background: #fff; cursor: pointer; }
        .nk3-qty button:first-child { border-radius: 9px 0 0 9px; }
        .nk3-qty button:last-child { border-radius: 0 9px 9px 0; }
        .nk3-qty span { text-align: center; border-top: 1px solid #d6d6cf; border-bottom: 1px solid #d6d6cf; min-height: 38px; display: grid; place-items: center; }
        .nk3-cart-quantity-row { display: grid; grid-template-columns: 48px minmax(64px, 1fr) 48px auto; gap: 12px; align-items: center; }
        .nk3-quantity-input { min-height: 48px; font-size: 18px; font-weight: 600; text-align: center; }
        .nk3-quantity-step { min-width: 44px; min-height: 48px; color: #063c28 !important; background: #fffdf5 !important; opacity: 1 !important; }
        .nk3-quantity-step:disabled { color: #063c28 !important; opacity: 1 !important; }
        .nk3-cart-button { white-space: nowrap; min-height: 48px; }
        .nk3-sambal-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .nk3-addons-shortcut { display: block; width: min(70%, 280px); min-height: 58px; margin: 14px auto 0; padding: 12px 10px; box-sizing: border-box; border: 1px solid #c9a441; border-radius: 12px; background: #fff8df; color: #123d2a; font-weight: 700; cursor: pointer; }
        .nk3-confirm-card { margin-top: 16px; overflow: hidden; border: 1px solid #d9d6c6; border-radius: 16px; background: #fff; box-shadow: 0 5px 16px rgba(18,61,42,.08); }
        .nk3-confirm-title { margin: 0; padding: 14px 16px; background: #075537; color: #fff8e7; font-size: 20px; }
        .nk3-total-box { margin-top: 16px; padding: 14px; border-radius: 12px; background: #f5f5ee; }
        @media (min-width: 760px) {
          .nk3-main-grid { grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); align-items: start; gap: 16px; }
          .nk3-page { padding: 18px; }
          .nk3-card { padding: 16px; }
        }
        @media (max-width: 480px) {
          .nk3-cart-quantity-row { grid-template-columns: 44px minmax(64px, 1fr) 44px; gap: 10px; row-gap: 12px; }
          .nk3-cart-button { grid-column: 1 / -1; width: 100%; white-space: normal; }
          .nk3-quantity-input { min-width: 64px; font-size: 18px; }
        }
        @media (max-width: 390px) {
          .nk3-sambal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .nk3-branch-photo { height: 88px; }
          .nk3-addon { grid-template-columns: 62px minmax(0, 1fr); gap: 9px; padding: 8px; }
          .nk3-addon-photo { width: 62px; height: 62px; }
          .nk3-qty { grid-template-columns: 30px 36px 30px; }
        }
        /* V29 brand theme: deep forest green, antique gold and warm cream */
        body { background: #f4efdc; }
        .nk3-page {
          color: #073b28;
          background-color: #fbf7e9;
          background-image: radial-gradient(ellipse at 12% 8%, rgba(201,164,65,.07), transparent 35%), radial-gradient(ellipse at 90% 90%, rgba(7,85,55,.06), transparent 36%);
        }
        .nk3-page h1, .nk3-page h2, .nk3-page h3 { color: #063c28; }
        .nk3-card {
          background: #fffdf5;
          border: 1px solid #c9a441;
          border-radius: 14px;
          box-shadow: 0 5px 15px rgba(3,53,34,.10);
        }
        .nk3-branch { background: #fff9e9; border-color: #c9a441; }
        .nk3-branch.selected { border-color: #075537; box-shadow: 0 0 0 2px rgba(201,164,65,.3); }
        .nk3-branch-name { color: #063c28; }
        .nk3-addon { background: #fff9e9; border-color: #d8c47c; }
        .nk3-addon-photo { border-color: #c9a441; }
        .nk3-qty button { border-color: #c9a441; background: #fff5d5; color: #063c28; }
        .nk3-qty span { border-color: #d7cba5; background: #fffdf5; color: #063c28; }
        .nk3-addons-shortcut { background: linear-gradient(135deg,#fff4cb,#f7e4a0); border: 1px solid #c9a441; color: #063c28; }
        .nk3-confirm-card { border: 2px solid #c9a441; background: #fffdf5; box-shadow: 0 6px 18px rgba(3,53,34,.13); }
        .nk3-page h2.nk3-confirm-title { background: linear-gradient(rgba(3,48,31,.88),rgba(3,48,31,.88)), url('/images/floral-texture.jpg') center/cover; color: #ffffff !important; border-bottom: 3px solid #c9a441; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(20px, 4vw, 30px); font-weight: 800; letter-spacing: .04em; text-transform: uppercase; padding: 18px 20px; display: flex; align-items: center; gap: 12px; }
        .nk3-confirm-button { display:flex; justify-content:center; align-items:center; gap:14px; min-height:76px; border-radius:18px; background:linear-gradient(135deg,#f7d45a,#e9b92e 55%,#f8d85f); color:#10150e; border:2px solid #d4a521; box-shadow:0 5px 12px rgba(125,91,8,.18); font-size:clamp(15px,3.4vw,21px); line-height:1.25; font-weight:900; letter-spacing:.01em; }
        .nk3-confirm-button svg { flex:0 0 auto; width:36px; height:36px; }
        .nk3-total-box { background: #edf2e3; border: 1px solid #d7dfc8; color: #063c28; }
        input, select { background-color: #fffdf5 !important; border-color: #d7cba5 !important; color: #153c2c !important; }
        .nk3-page button { transition: box-shadow .15s ease, transform .15s ease; }
        .nk3-page button:active { transform: translateY(1px); }
      `}</style>

      <header style={{ overflow: "hidden", borderRadius: 16, border: "2px solid #c9a441", background: "#003b24", color: "#fff8e7", marginBottom: 16, boxShadow: "0 5px 18px rgba(0,59,36,.12)" }}>
        <Photo src={activeImagePaths.banner} alt="Banner Nasi Katok 3 Abdul" className="nk3-banner" />
        {siteSettings?.announcement?.enabled && (siteSettings.announcement.textBm || siteSettings.announcement.textEn) && <div role="status" style={{ padding: "9px 12px", background: "#fff4c7", color: "#173f30", borderBottom: "1px solid #d6b33f", fontSize: 13, fontWeight: 700 }}>{isEnglish ? (siteSettings.announcement.textEn || siteSettings.announcement.textBm) : (siteSettings.announcement.textBm || siteSettings.announcement.textEn)}</div>}
        {siteSettings?.announcement?.enabled && (siteSettings.announcement.textBm || siteSettings.announcement.textEn) && <div role="status" style={{ padding: "9px 12px", background: "#fff4c7", color: "#173f30", borderBottom: "1px solid #d6b33f", fontSize: 13, fontWeight: 700 }}>{isEnglish ? (siteSettings.announcement.textEn || siteSettings.announcement.textBm) : (siteSettings.announcement.textBm || siteSettings.announcement.textEn)}</div>}
        <div style={{ padding: "10px 12px", textAlign: "center", background: "linear-gradient(135deg, #032f20, #075537 52%, #032f20)", borderTop: "2px solid #c9a441" }}>
          <div className="nk3-language-admin-row">
            {siteSettings?.language?.bm !== false && <button type="button" onClick={() => setLanguage("bm")} aria-pressed={!isEnglish} style={{...buttonStyle,width:"100%",minWidth:0,minHeight:42,padding:"8px 5px",fontSize:"clamp(11px, 2.8vw, 15px)",whiteSpace:"nowrap",background:!isEnglish?"#e8c75c":"transparent",color:!isEnglish?"#173326":"#fff8e7",borderColor:"#c9a441"}}>BM · Bahasa Melayu</button>}
            {siteSettings?.language?.en !== false && <button type="button" onClick={() => setLanguage("en")} aria-pressed={isEnglish} style={{...buttonStyle,width:"100%",minWidth:0,minHeight:42,padding:"8px 5px",fontSize:"clamp(11px, 2.8vw, 15px)",whiteSpace:"nowrap",background:isEnglish?"#e8c75c":"transparent",color:isEnglish?"#173326":"#fff8e7",borderColor:"#c9a441"}}>EN · English</button>}
            {adminSessionActive ? <a href="/admin" className="nk3-admin-access" aria-label="Admin Dashboard">ADMIN ↗</a> : <button type="button" className="nk3-admin-access nk3-admin-disabled" disabled aria-label="Admin access locked" title="Akses admin hanya selepas log masuk admin">ADMIN 🔒</button>}
          </div>
          <strong style={{ fontSize: 22, letterSpacing: 2, color: "#e8c75c", fontFamily: "Georgia, Times New Roman, serif", textShadow: "0 2px 4px rgba(0,0,0,.3)" }}>NASI KATOK 3 ABDUL</strong>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "#f8e9b4" }}>{tr("Sila isi borang pesanan anda.","Please complete your order form.")}</p>
        </div>
      </header>

      <div className="nk3-main-grid">
        <div>
          <section className="nk3-card">
            <h2 style={sectionTitleStyle}>📍 1. {tr("Pilih cawangan", "Choose branch")}</h2>
            <div className="nk3-branch-grid">
              {([
                { name: "Rimba", src: activeImagePaths.rimba },
                { name: "Telisai", src: activeImagePaths.telisai },
              ] as const).filter(item => branchConfig[item.name]?.enabled !== false).map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`nk3-branch ${branch === item.name ? "selected" : ""}`}
                  aria-pressed={branch === item.name}
                  onClick={() => {
                    setBranch(item.name);
                    setTime("");
                    if (item.name === "Telisai" && todaySelected && bruneiWeekday === "Sun") {
                      setTodaySelected(false);
                      setDate(tomorrowDate);
                    }
                  }}
                >                  <Photo src={item.src} alt={tr(`Kedai Nasi Katok 3 Abdul ${item.name}`, `Nasi Katok 3 Abdul ${item.name} branch`)} className="nk3-branch-photo" />
                  <span className="nk3-branch-name">{branch === item.name ? "✓ " : ""}{item.name}</span>                </button>
              ))}            </div>
          </section>
          <section className="nk3-card">            <h2 style={sectionTitleStyle}>🗓️ 2. {tr("Maklumat pelanggan & waktu ambil", "Customer details & pickup time")}</h2>
            <div style={{ background: "#fffdf7", border: "1px solid #e2dcc5", borderRadius: 16, padding: 14, color: "#173f30" }}>              <div style={{ color: "#c9a441", fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>{tr("1. NAMA", "1. NAME")}</div>
              <input style={{ ...inputStyle, marginBottom: 20 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Masukkan nama pelanggan", "Enter customer name")} />
              <div style={{ color: "#c9a441", fontWeight: 800, letterSpacing: 2, marginBottom: 12, fontSize: 18 }}>{tr("2. TARIKH AMBIL PESANAN", "2. PICKUP DATE")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 18 }}>
                <button type="button" aria-pressed={todaySelected} disabled={todayButtonClosed} onClick={() => { if (todayButtonClosed) return; setTodaySelected(true); setDate(bruneiToday); }} style={{ position:"relative", textAlign:"left", display:"flex", alignItems:"center", gap:10, padding:"14px 12px", minHeight:86, borderRadius:16, border:todaySelected?"3px solid #e4c64d":"2px solid #c9a441", background:todayButtonClosed?"#e5e7eb":todaySelected?"#075537":"#fffdf7", color:todayButtonClosed?"#6b7280":todaySelected?"#fff8e7":"#8b6416", fontWeight:800, cursor:todayButtonClosed?"not-allowed":"pointer", opacity:todayButtonClosed?0.8:1, boxShadow:todaySelected?"0 0 0 2px rgba(201,164,65,.25)":"none" }}>
                  <span style={{fontSize:30, lineHeight:1}}>▣</span><span><span style={{display:"block",fontSize:16}}>{todayButtonClosed ? tr("TUTUP", "CLOSED") : tr("HARI INI", "TODAY")}</span><span style={{display:"block",fontSize:12,fontWeight:500,marginTop:4}}>{todayButtonClosed ? tr("Di luar waktu operasi", "Outside operating hours") : tr("Ambil pesanan hari ini", "Pick up order today")}</span></span>{todaySelected&&<span style={{position:"absolute",right:-5,top:-9,background:"#087447",border:"2px solid #fff",borderRadius:"50%",width:28,height:28,display:"grid",placeItems:"center",color:"white",fontSize:17}}>✓</span>}
                </button>
                <button type="button" aria-pressed={!todaySelected} onClick={() => { setTodaySelected(false); setDate((current) => current < tomorrowDate ? tomorrowDate : current); }} style={{ textAlign:"left", display:"flex", alignItems:"center", gap:10, padding:"14px 12px", minHeight:86, borderRadius:16, border:!todaySelected?"3px solid #e4c64d":"2px solid #c9a441", background:!todaySelected?"#fff8df":"#fffdf7", color:"#8b6416", fontWeight:800, cursor:"pointer" }}>
                  <span style={{fontSize:30,lineHeight:1}}>▦</span><span><span style={{display:"block",fontSize:15}}>{tr("TEMPAHAN AWAL", "ADVANCE ORDER")}</span><span style={{display:"block",fontSize:12,fontWeight:500,marginTop:4}}>{tr("Pilih tarikh akan datang", "Choose a future date")}</span></span>
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "0.75fr 1.5fr 1fr", gap: 10, marginBottom: 22 }}>
                {([{label:"DAY", value: date.split("-")[2], options: Array.from({length:31},(_,i)=>String(i+1).padStart(2,"0")), part:2}, {label:"MONTH", value: date.split("-")[1], options:Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0")), part:1}, {label:"YEAR", value: date.split("-")[0], options:Array.from({length:3},(_,i)=>String(Number(tomorrowDate.slice(0,4))+i)), part:0}] as const).map((field) => <label key={field.label} style={{ display:"block", minWidth:0, fontSize:13, fontWeight:700, letterSpacing:1, color:"#173f30" }}>{field.label}<select disabled={todaySelected} value={field.value} onChange={(e)=>{ const parts=date.split("-"); parts[field.part]=e.target.value; const candidate=`${parts[0]}-${parts[1]}-${parts[2]}`; if(candidate >= tomorrowDate) setDate(candidate); }} style={{ ...inputStyle, marginTop:7, padding:"12px 8px", borderColor: todaySelected ? "#deded8" : "#cbd5cf", background:todaySelected?"#eeeeea":"#fff", color:todaySelected?"#999":"#173f30", opacity:todaySelected?0.65:1, cursor:todaySelected?"not-allowed":"pointer" }}>{field.options.map((option)=><option key={option} value={option}>{field.label==="MONTH"?new Date(2000,Number(option)-1,1).toLocaleString(isEnglish ? "en" : "ms",{month:"long"}):option}</option>)}</select></label>)}
              </div>
              <div style={{ color: "#c9a441", fontWeight: 800, letterSpacing: 2, marginBottom: 8, fontSize:18 }}>{tr("3. WAKTU AMBIL", "3. PICKUP TIME")}</div>
              <div style={{ color:"#7a7d78", fontSize:13, letterSpacing:1, marginBottom:10 }}>{tr("PILIH WAKTU AMBIL YANG TERSEDIA", "SELECT AN AVAILABLE PICKUP TIME")}</div>
              <label style={{display:"block"}}><select style={{ ...inputStyle, border:"2px solid #c9a441", background:"#fff", minHeight:60 }} value={time} onChange={(e) => setTime(e.target.value)}><option value="">{tr("Pilih waktu", "Choose a time")}</option>{timeSlots.map((slot) => <option key={slot}>{slot}</option>)}</select></label>
            </div>
          </section>


          {stage === "order" && (
            <section className="nk3-card">
              <h2 style={sectionTitleStyle}>🌶️ 4. {tr("Pilihan sambal", "Choose sambal")}</h2>
              <div style={{ ...noticeStyle, marginBottom: 12, padding: "10px 12px", borderRadius: 12, fontSize: 12, lineHeight: 1.4 }}>
                <strong style={{ display: "block", marginBottom: 4 }}>{tr("CARA PILIH & CAMPUR SAMBAL", "HOW TO CHOOSE & MIX SAMBAL")}</strong>
                <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
                  <li>{tr("Tekan sambal pilihan pertama.", "Tap your first sambal choice.")}</li>
                  <li>{tr("Tekan sambal lain untuk campur dalam bungkus yang sama.", "Tap other sambal types to mix them in the same pack.")}</li>
                  <li>{tr("Tekan sambal yang sama kali ke-2 untuk Extra Sambal (+$0.50).", "Tap the same sambal a 2nd time for Extra Sambal (+$0.50).")}</li>
                  <li>{tr("Tekan kali ke-3 untuk membatalkan pilihan sambal itu.", "Tap a 3rd time to cancel that sambal choice.")}</li>
                </ul>
                <div style={{ borderTop: "1px solid #e6d58b", paddingTop: 7 }}>
                  <strong style={{ display: "block", marginBottom: 3 }}>{tr("HARGA CAMPURAN", "MIXED SAMBAL PRICES")}</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>{tr("1–2 jenis sambal: $1.00 sebungkus.", "1–2 sambal types: $1.00 per pack.")}</li>
                    <li>{tr("3 jenis atau lebih: +$0.50 bagi setiap jenis selepas 2 pilihan.", "3 or more types: +$0.50 for each type after the first 2.")}</li>
                  </ul>
                </div>
              </div>
              <div className="nk3-sambal-grid">
                {availableSambals.map((sambal: string) => {
                  const isSelected = selected.includes(sambal);
                  const extraCount = selectedExtraSambals.filter((item) => item === sambal).length;
                  const isUnavailable = false;
                  return (
                    <button key={sambal} type="button" aria-pressed={isSelected} disabled={isUnavailable}
                      onClick={() => { if (!isUnavailable) toggleSambal(sambal); }}
                      title={isUnavailable ? tr("Lada Padi buat masa ini tidak tersedia", "Lada Padi is temporarily unavailable") : undefined}                      style={{ ...buttonStyle, minHeight: 58, padding: "12px 6px", border: isSelected ? "2px solid #c9a441" : isUnavailable ? "1px dashed #b8b8b0" : "1px solid #d8d8d2", background: isSelected ? "#075537" : isUnavailable ? "#eeeeea" : "#fff", color: isSelected ? "#fff8e7" : isUnavailable ? "#8b8b84" : "#123d2a", fontWeight: isSelected ? 700 : 500, overflowWrap: "anywhere", cursor: isUnavailable ? "not-allowed" : "pointer", opacity: isUnavailable ? 0.75 : 1 }}>
                      {isSelected ? "✓ " : ""}{sambal}{extraCount > 0 ? ` · ${tr("Extra", "Extra")} ×${extraCount}` : ""}{isUnavailable ? tr(" (Tidak tersedia)", " (Temporarily unavailable)") : ""}
                      {isSelected && <span style={{ display: "block", marginTop: 5, fontSize: 11, lineHeight: 1.3, fontWeight: 500 }}>{extraCount > 0 ? tr("( Extra $0.50 ✅ ) Tekan lagi untuk batalkan pilihan", "( Extra $0.50 ✅ ) Tap again to cancel") : tr("Tekan lagi untuk Extra Sambal (+$0.50)", "Tap again for Extra Sambal (+$0.50)")}</span>}
                    </button>
                  );
                })}
                <button type="button" aria-pressed={selected.includes(NO_SAMBAL)}
                  onClick={() => toggleSambal(NO_SAMBAL)}
                  style={{ ...buttonStyle, minHeight: 58, padding: "12px 6px", border: selected.includes(NO_SAMBAL) ? "2px solid #c9a441" : "1px solid #d8d8d2", background: selected.includes(NO_SAMBAL) ? "#075537" : "#fff", color: selected.includes(NO_SAMBAL) ? "#fff8e7" : "#123d2a", fontWeight: 700, overflowWrap: "anywhere" }}>
                  {selected.includes(NO_SAMBAL) ? "✓ " : ""}{tr("Tanpa Sambal", "No Sambal")}
                </button>
              </div>


              <label style={{ display: "block", fontWeight: 700, margin: "18px 0 8px" }}>{tr("Kuantiti bungkus", "Pack quantity")}</label>
              <div className="nk3-cart-quantity-row">
                <button type="button" className="nk3-quantity-step" style={{ ...buttonStyle, padding: 8 }} disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <input className="nk3-quantity-input" style={{ ...inputStyle, textAlign: "center", width: "100%", minWidth: 0, boxSizing: "border-box", color: "#063c28", background: "#fffdf5", opacity: 1 }} type="number" min={1} max={100} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
                <button type="button" className="nk3-quantity-step" style={{ ...buttonStyle, padding: 8 }} disabled={quantity >= 100} onClick={() => setQuantity((q) => Math.min(100, q + 1))}>+</button>
                <button type="button" className="nk3-cart-button" onClick={addLine} style={{ ...buttonStyle, padding: "12px 16px", background: "#075537", color: "#fff8e7", borderColor: "#c9a441" }}>🛒 {tr("Tambah ke Troli", "Add to Cart")}</button>
              </div>
              <button type="button" className="nk3-addons-shortcut" onClick={() => continueTo("addons")}>＋ Add On's</button>

              {selectedExtraSambals.length > 0 && (
                <div style={{ marginTop: 12, padding: 12, border: "1px solid #e6c85c", borderRadius: 10, background: "#fffaf0" }}>
                  <strong>{tr("Extra Sambal dipilih", "Selected Extra Sambal")}</strong>
                  {selectedExtraSambals.map((extra, index) => (
                    <div key={`${extra}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 8 }}>
                      <span>{extra} — $0.50</span>
                      <button type="button" onClick={() => removeSelectedExtraSambal(index)} style={{ ...buttonStyle, padding: "6px 10px", color: "#a33a32", borderColor: "#d9aaa6", background: "#fff" }}>{tr("Buang Extra Sambal", "Remove Extra Sambal")}</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="nk3-total-box">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span>{tr("Harga sebungkus", "Price per pack")}</span><strong>{money(calculatePackPrice(selected, selectedExtraSambals))}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}><span>{tr("Jumlah pilihan semasa", "Current selection total")}</span><strong>{money(quantity * pricePerPack(selected, selectedExtraSambals))}</strong></div>
              </div>

              <div style={{ marginTop: 16, borderTop: "1px solid #e6e9e7", paddingTop: 12 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 17 }}>{tr("Pesanan dipilih", "Selected order")}</h3>
                {lines.length === 0 ? <p style={{ margin: "8px 0", color: "#68756d" }}>{tr("Belum ada pesanan.", "No items added yet.")}</p> : lines.map((line, index) => (
                  <div key={line.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #eee" }}>
                    <span style={{ flex: "1 1 auto", minWidth: 0, overflowWrap: "anywhere" }}>{index + 1}. {displaySambals(line.sambals, line.extraSambals, isEnglish)} × {line.quantity}</span>
                    <strong style={{ whiteSpace: "nowrap" }}>{money(line.quantity * calculatePackPrice(line.sambals, line.extraSambals))}</strong>
                    <button type="button" aria-label={tr("Hapus seluruh pesanan", "Delete entire order")} title={tr("Hapus seluruh pilihan pesanan", "Delete entire selected order")} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} style={{ ...buttonStyle, padding: "7px 10px", color: "#a33a32", borderColor: "#d9aaa6", background: "#fff", flex: "0 0 auto", fontSize: 12 }}>{tr("Hapus", "Delete")}</button>
                    {line.extraSambals.length > 0 && <button type="button" onClick={() => removeLineExtraSambal(line.id, line.extraSambals.length - 1)} style={{ ...buttonStyle, padding: "6px 8px", fontSize: 11, color: "#a33a32", borderColor: "#d9aaa6", background: "#fff", flex: "0 0 auto" }}>{tr("Buang Extra", "Remove Extra")}</button>}
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}><strong>{tr("Subtotal", "Subtotal")}</strong><strong>{money(subtotal)}</strong></div>
                <div style={{ marginTop: 14 }}>
                  <label htmlFor="nk3-special-notes" style={{ display: "block", fontWeight: 700, marginBottom: 7, color: "#123d2a" }}>{tr("Special Notes (Pilihan)", "Special Notes (Optional)")}</label>
                  <textarea
                    id="nk3-special-notes"
                    value={specialNotes}
                    onChange={(event) => setSpecialNotes(event.target.value)}
                    placeholder={tr("Tulis permintaan khas di sini...", "Write any special requests here...")}
                    rows={3}
                    style={{ ...inputStyle, minHeight: 84, resize: "vertical", fontWeight: 400, lineHeight: 1.45 }}
                  />
                </div>
              </div>
              
            </section>
          )}
        </div>

        <div>
          {stage === "addons" && (
            <section className="nk3-card">
              <h2 style={sectionTitleStyle}>🛍️ 5. {tr("Add On's", "Add-ons")}</h2>

              {showChickenAddon && (<div className="nk3-addon">
                <Photo src={activeImagePaths.chicken} alt={tr("Ayam goreng", "Fried chicken")} className="nk3-addon-photo" />
                <div className="nk3-addon-content">
                  <div className="nk3-addon-row"><strong>{tr("Ayam Goreng", "Fried chicken")}</strong><strong>{money(chickenUnitPrice)}</strong></div>
                  <div className="nk3-addon-row" style={{ marginTop: 8 }}>
                    <span style={{ color: "#68756d", fontSize: 13 }}>{tr("Kuantiti", "Quantity")}</span>
                    <div className="nk3-qty">
                      <button type="button" aria-label={tr("Kurangkan ayam", "Decrease chicken")} onClick={() => setChickenQuantity((q) => Math.max(0, q - 1))}>−</button>
                      <span>{chickenQuantity}</span>
                      <button type="button" aria-label={tr("Tambah ayam", "Increase chicken")} onClick={() => setChickenQuantity((q) => Math.min(100, q + 1))}>+</button>
                    </div>
                  </div>
                </div>
              </div>

              )}

              {showRiceAddon && (<div className="nk3-addon">
                <Photo src={activeImagePaths.rice} alt={tr("Nasi putih", "Plain rice")} className="nk3-addon-photo" />
                <div className="nk3-addon-content">
                  <div className="nk3-addon-row"><strong>{tr("Nasi Putih", "Plain rice")}</strong><strong>{money(Number(riceUnitPrice))}</strong></div>
                  <div className="nk3-addon-row" style={{ marginTop: 8 }}>
                    <select aria-label={tr("Harga nasi putih", "Rice price")} style={{ ...inputStyle, padding: "8px 5px", fontSize: 14, maxWidth: 104 }} value={riceUnitPrice} onChange={(e) => setRiceUnitPrice(e.target.value)}>
                      <option value={String(riceSmallPrice)}>{money(riceSmallPrice)}</option><option value={String(riceLargePrice)}>{money(riceLargePrice)}</option>
                    </select>
                    <div className="nk3-qty">
                      <button type="button" aria-label={tr("Kurangkan nasi", "Decrease rice")} onClick={() => setRiceQuantity((q) => Math.max(0, q - 1))}>−</button>
                      <span>{riceQuantity}</span>
                      <button type="button" aria-label={tr("Tambah nasi", "Increase rice")} onClick={() => setRiceQuantity((q) => Math.min(100, q + 1))}>+</button>
                    </div>
                  </div>
                </div>
              </div>


              )}

              {showSeparateSambalAddon && (<div className="nk3-addon">
                <Photo src={activeImagePaths.sambal} alt={tr("Sambal tambahan berasingan", "Separate extra sambal") } className="nk3-addon-photo" />
                <div className="nk3-addon-content">
                  <div className="nk3-addon-row"><strong>Extra Sambal</strong><strong>{addonSambalEnabled ? money(Number(addonSambalPrice)) : tr("Pilihan", "Optional")}</strong></div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0", fontSize: 14 }}>
                    <input type="checkbox" checked={addonSambalEnabled} onChange={(e) => setAddonSambalEnabled(e.target.checked)} /> {tr("Tambah sambal berasingan", "Add sambal separately")}
                  </label>
                  <select aria-label={tr("Jenis Add On sambal", "Add-on sambal type")} style={{ ...inputStyle, padding: "8px", fontSize: 14, marginBottom: 7, width: "100%" }} value={addonSambalType} onChange={(e) => setAddonSambalType(e.target.value)}>
                    {availableSambals.map((item: string) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select aria-label={tr("Harga Add On sambal", "Add-on sambal price")} style={{ ...inputStyle, padding: "8px", fontSize: 14, width: "100%" }} value={addonSambalPrice} onChange={(e) => setAddonSambalPrice(e.target.value)}>
                    {Array.from({ length: 10 }, (_, i) => ((i + 1) * 0.5).toFixed(2)).map((price) => <option key={price} value={price}>{money(Number(price))}</option>)}
                  </select>
                </div>
              </div>

              )}

              <div className="nk3-total-box" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <strong>{tr("Jumlah Add On's", "Add-ons total")}</strong><strong>{money(addonTotal)}</strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setChickenQuantity(0);
                    setRiceQuantity(0);
                    setAddonSambalEnabled(false);
                    setStage("review");
                  }}
                  style={{ ...buttonStyle, width: "100%", padding: "12px 8px" }}
                >
                  {tr("Tidak, terima kasih", "No thanks")}
                </button>
                <button
                  type="button"
                  onClick={() => setStage("review")}
                  style={{ ...buttonStyle, width: "100%", padding: "12px 8px", background: "#075537", color: "#fff8e7", borderColor: "#c9a441" }}
                >
                  {tr("Sahkan Add On", "Confirm add-ons")}
                </button>
              </div>
            </section>
          )}

          {(stage === "review" || stage === "done") && (
            <section className="nk3-card">
              <h2 style={sectionTitleStyle}>{stage === "done" ? tr("✅ Ringkasan pesanan", "✅ Order summary") : tr("📋 Semak pesanan", "📋 Review order")}</h2>
              {stage === "done" && <p role="status">{message}</p>}
              <p><strong>{tr("Nama:", "Name:")}</strong> {name}</p>
              <p><strong>{tr("Cawangan:", "Branch:")}</strong> {branch}</p>
              <p><strong>{tr("Tarikh ambil:", "Pickup date:")}</strong> {date}</p>
              <p><strong>{tr(isEnglish ? "Pickup time:" : "Waktu ambil:", "Pickup time:")}</strong> {time}</p>
              <h3>{tr("Pesanan", "Order")}</h3>
              {lines.map((line, index) => <p key={line.id}>{index + 1}. {displaySambals(line.sambals, line.extraSambals, isEnglish)} × {line.quantity} — {money(line.quantity * pricePerPack(line.sambals, line.extraSambals))}</p>)}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span>{tr("Subtotal", "Subtotal")}</span><strong>{money(subtotal)}</strong></div>
              <div style={{ marginTop: 10 }}>
                <strong>{tr("Add On's", "Add-ons")}</strong>
                {chickenQuantity > 0 && <p style={{ margin: "5px 0" }}>{tr("Ayam Goreng", "Fried chicken")} × {chickenQuantity} — {money(chickenQuantity)}</p>}
                {riceQuantity > 0 && <p style={{ margin: "5px 0" }}>{tr("Nasi Putih", "Plain rice")} × {riceQuantity} — {money(riceQuantity * Number(riceUnitPrice))}</p>}
                {addonSambalEnabled && <p style={{ margin: "5px 0" }}>{tr("Extra Sambal berasingan", "Separate Extra Sambal")} ({addonSambalType}) — {money(Number(addonSambalPrice))}</p>}
                {addonTotal === 0 && <p style={{ color: "#68756d" }}>{tr("Tiada Add On.", "No add-ons.")}</p>}
              </div>
              <h2 style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: "1px solid #e6e9e7", paddingTop: 12 }}><span>{tr("Jumlah", "Total")}</span><span>{money(total)}</span></h2>
              {stage === "review" && <button type="button" onClick={() => setStage("order")} style={{ ...buttonStyle, width: "100%", marginTop: 12 }}>{tr("Kembali edit pesanan", "Back to edit order")}</button>}
            </section>
          )}


        </div>
      </div>

      {message && message !== "Sila isi nama, tarikh dan waktu ambil." && message !== "Please enter your name, pickup date and pickup time." && <div role="status" style={{ width: "100%", boxSizing: "border-box", marginTop: 16, marginBottom: 0, padding: "12px 16px", borderRadius: 12, border: `1px solid ${(message === "Pesanan ditambah." || message === "Order added.") ? "#8cc9a5" : "#d9a39a"}`, background: (message === "Pesanan ditambah." || message === "Order added.") ? "#eaf7ee" : "#fff0ed", color: (message === "Pesanan ditambah." || message === "Order added.") ? "#087447" : "#a33b2b", fontWeight: 600, lineHeight: 1.45 }}>{message}</div>}

      <section className="nk3-confirm-card" style={{ width: "100%", marginTop: 16 }}>
          <h2 className="nk3-confirm-title"><span aria-hidden="true" style={{ display: "inline-grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", background: "#e8bd3e", color: "#063c28", fontFamily: "Arial, sans-serif", fontSize: 27, flex: "0 0 auto" }}>✓</span><span>{tr("Sahkan Pesanan", "Confirm Order")}</span></h2>
          <div style={{ padding: 16, textAlign: "center" }}>
            <p style={{ margin: "0 0 14px", lineHeight: 1.5 }}>{tr("Sila semak semula semua maklumat pesanan anda sebelum menghantar ke WhatsApp.", "Please review all your order details before sending to WhatsApp.")}</p>
            {stage !== "done" && <>
              <div style={{ margin: "0 0 8px", overflow: "hidden", borderRadius: 9, border: "1px solid #d6b33f", background: "#fffefa", color: "#14251d", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "4px 7px", background: "linear-gradient(105deg,#00452b,#075537)", color: "#fffefa", borderBottom: "2px solid #d6b33f" }}>
                  <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 21, height: 21, flex: "0 0 21px", borderRadius: "50%", background: "#f5d21b", color: "#07502f", fontSize: 15, fontWeight: 900, fontFamily: "Georgia,serif" }}>i</span>
                  <span style={{ fontFamily: "Georgia,serif", fontWeight: 900, fontSize: 12, letterSpacing: .8 }}>{tr("MAKLUMAN", "NOTICE")}</span>
                </div>
                <div style={{ padding: "4px 6px 6px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(40px,48px) 2px minmax(0,1fr)", alignItems: "center", gap: 5, padding: "2px 0 5px", borderBottom: "1px solid #e9e3d1" }}>
                    <div aria-hidden="true" style={{ display: "grid", placeItems: "center", minHeight: 34, color: "#087044" }}>
                      <svg viewBox="0 0 100 90" style={{ width: "36px", height: "32px" }} fill="currentColor"><path d="M7 10h10l8 43a8 8 0 0 0 8 6h43a7 7 0 0 0 7-5l9-29H29l-2-10H7z"/><circle cx="39" cy="72" r="6"/><circle cx="74" cy="72" r="6"/><circle cx="76" cy="17" r="16" fill="#f4cc13"/><path d="m68 17 6 6 11-13" fill="none" stroke="#075537" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span aria-hidden="true" style={{ width: 2, height: "76%", minHeight: 28, background: "#e3bd30", borderRadius: 3 }} />
                    <p style={{ margin: 0, fontSize: 11, lineHeight: 1.28 }}>{tr("Setelah selesai membuat pesanan, sila", "After completing your order, please")} <strong style={{ display: "inline", padding: "1px 3px", borderRadius: 4, background: "#ffe329", color: "#111" }}>{tr("tekan butang KUNING di bawah", "press the YELLOW button below")}</strong> {tr("untuk menghantar pesanan anda.", "to submit your order.")}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(40px,48px) 2px minmax(0,1fr)", alignItems: "center", gap: 5, padding: "5px 0", borderBottom: "1px solid #e9e3d1" }}>
                    <div aria-hidden="true" style={{ display: "grid", placeItems: "center", minHeight: 30 }}>
                      <svg viewBox="0 0 100 78" style={{ width: "36px", height: "30px" }}><circle cx="39" cy="36" r="29" fill="#16b65a"/><path d="M18 62 22 49a25 25 0 1 1 9 10z" fill="#16b65a" stroke="#087044" strokeWidth="2"/><path d="M30 21c-3 2-5 7-2 13 5 11 14 17 22 18 4 0 8-4 8-7l-10-6-5 5c-5-2-9-6-11-11l4-4z" fill="#fff"/><path d="M60 51h25l-1-8 14 12-14 12 1-8H60z" fill="#efbf16"/></svg>
                    </div>
                    <span aria-hidden="true" style={{ width: 2, height: "76%", minHeight: 27, background: "#e3bd30", borderRadius: 3 }} />
                    <p style={{ margin: 0, fontSize: 11, lineHeight: 1.28 }}>{tr("Sila tunggu sebentar sehingga anda dialihkan ke WhatsApp.", "Please wait a moment while you are redirected to WhatsApp.")}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(40px,48px) 2px minmax(0,1fr)", alignItems: "center", gap: 5, padding: "5px 0", borderBottom: "1px solid #e9e3d1" }}>
                    <div aria-hidden="true" style={{ display: "grid", placeItems: "center", minHeight: 34 }}>
                      <svg viewBox="0 0 100 90" style={{ width: "36px", height: "32px" }} fill="#087044"><path d="M8 43 88 8 62 81 45 54 8 43zm38 7 12 17 8-32z"/><path d="m45 54 25-22" stroke="#fff" strokeWidth="3" fill="none"/><rect x="10" y="70" width="80" height="17" rx="8" fill="#087044"/><text x="50" y="82" fontSize="10" textAnchor="middle" fill="#fff">Hantar (Send)</text></svg>
                    </div>
                    <span aria-hidden="true" style={{ width: 2, height: "76%", minHeight: 30, background: "#e3bd30", borderRadius: 3 }} />
                    <p style={{ margin: 0, fontSize: 11, lineHeight: 1.28 }}>{tr("Pastikan anda menekan butang", "Make sure you press the")} <strong style={{ display: "inline-block", padding: "1px 3px", borderRadius: 4, background: "#ffe329", color: "#111" }}>{tr("Hantar (Send)", "Send")}</strong> {tr("di WhatsApp supaya pesanan anda diterima oleh pihak kami.", "button in WhatsApp so our team receives your order.")}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 5, padding: "5px 4px", borderRadius: 7, background: "#e5f2ce", color: "#06482e" }}>
                    <span aria-hidden="true" style={{ fontSize: 14 }}>🤝</span>
                    <span style={{ width: 2, height: 16, background: "#075537" }} />
                    <strong style={{ fontSize: 11, fontStyle: "italic", lineHeight: 1.2 }}>{tr("Terima kasih atas pesanan anda!", "Thank you for your order!")}</strong>
                  </div>
                </div>
              </div>
              {showPickupValidation && (!name.trim() || (!todaySelected && !date) || !time) && <p role="alert" style={{ margin: "0 0 14px", padding: "12px 14px", borderRadius: 12, border: "1px solid #d9a39a", background: "#fff0ed", color: "#a33b2b", fontWeight: 700, lineHeight: 1.45, textAlign: "left" }}>{tr("Sila isi nama, tarikh dan waktu ambil.", "Please enter your name, pickup date and pickup time.")}</p>}
              <button type="button" onClick={confirmOrder} disabled={isSubmittingOrder || !orderingEnabled} aria-busy={isSubmittingOrder || !orderingEnabled} className="nk3-confirm-button" style={{ ...buttonStyle, width: "100%", padding: "18px 14px", background: "linear-gradient(135deg,#ffd633,#f2b900 55%,#ffda43)", color: "#10150e", border: "2px solid #d4a521", boxShadow: "0 6px 14px rgba(125,91,8,.25)", fontWeight: 900 }}><svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><path d="M16 2.5A13.2 13.2 0 0 0 4.7 22.5L3 29l6.7-1.7A13.2 13.2 0 1 0 16 2.5Zm0 23.9a10.7 10.7 0 0 1-5.4-1.5l-.4-.2-4 .9 1-3.9-.3-.4A10.7 10.7 0 1 1 16 26.4Zm5.9-8c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.8 8.8 0 0 1-2.6-1.6 9.8 9.8 0 0 1-1.8-2.2c-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.4.3-.6s0-.4 0-.6l-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.9 1.2 3.3 1.4 3.5 2.4 3.7 5.8 5.1c.8.3 1.4.5 1.9.6.8.2 1.5.2 2 .1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4s-.3-.3-.6-.4Z"/></svg><span>{!orderingEnabled ? tr("PESANAN DITUTUP SEMENTARA", "ORDERING TEMPORARILY CLOSED") : isSubmittingOrder ? tr("Sila Tunggu Sebentar ⏳", "Please Wait ⏳") : tr("SAHKAN PESANAN & HANTAR KE WHATSAPP", "CONFIRM ORDER & SEND TO WHATSAPP")} {orderingEnabled && !isSubmittingOrder && "↗"}</span></button>
            </>}
            {stage === "done" && <p role="status" style={{ margin: 0, color: "#087447", fontWeight: 700 }}>{message}</p>}
          </div>
        </section>
    </main>
  );
}