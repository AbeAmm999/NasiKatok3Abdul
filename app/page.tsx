"use client";

import { useMemo, useState } from "react";

const SAMBALS = ["Biasa", "Tahai Biasa", "Pusu Biasa", "Udang Biasa", "Pedas Manis", "Padas Padas", "Lada Padi"];
type Line = { id: number; sambals: string[]; quantity: number };

function money(n: number) { return `$${n.toFixed(2)}`; }

export default function Home() {
  const [branch, setBranch] = useState("Telisai");
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" }));
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [stage, setStage] = useState<"order"|"addons"|"review"|"done">("order");
  const [addonChicken, setAddonChicken] = useState(0);
  const [addonRice, setAddonRice] = useState(0);
  const [extraType, setExtraType] = useState("Biasa");
  const [extraPrice, setExtraPrice] = useState("0.50");
  const [noAddons, setNoAddons] = useState(true);
  const [message, setMessage] = useState("");

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + (line.sambals.length === 3 ? 1.5 : 1) * line.quantity, 0), [lines]);
  const addonsTotal = noAddons ? 0 : addonChicken + addonRice * 0.5 + Number(extraPrice);
  const total = subtotal + addonsTotal;

  const slots = useMemo(() => {
    const now = new Date();
    const bruneiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Brunei" }));
    const start = new Date(`${date}T10:00:00`);
    const end = new Date(`${date}T17:00:00`);
    const list: string[] = [];
    for (let t = start; t <= end; t = new Date(t.getTime() + 30 * 60000)) {
      const diff = t.getTime() - bruneiNow.getTime();
      const sameDay = date === now.toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" });
      if (!sameDay || diff >= 30 * 60000) list.push(t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
    }
    return list;
  }, [date]);

  function addLine() {
    if (!selected.length || selected.length > 3 || quantity < 1 || quantity > 100) {
      setMessage("Pilih 1–3 jenis sambal dan kuantiti 1–100 sebelum menambah order.");
      return;
    }
    setLines(prev => [...prev, { id: Date.now(), sambals: selected, quantity }]);
    setSelected([]);
    setQuantity(0);
    setMessage("Order ditambah. Pilih kombinasi seterusnya atau teruskan.");
  }
  function removeLine(id: number) { setLines(prev => prev.filter(line => line.id !== id)); }
  function proceed() {
    if (!name.trim() || !time || lines.length === 0) { setMessage("Isi nama, pilih waktu ambil dan tambah sekurang-kurangnya satu order."); return; }
    setMessage("");
    setStage("addons");
  }
  async function confirm() {
    const payload = { branch, name: name.trim(), pickupDate: date, pickupTime: time, lines, addons: noAddons ? [] : [{ type:"Ayam Goreng", quantity:addonChicken }, { type:"Nasi Putih", quantity:addonRice }, { type:`Extra Sambal ${extraType}`, price:Number(extraPrice), quantity:1 }].filter((x:any) => x.quantity > 0), total };
    try {
      const response = await fetch("/api/orders", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pesanan gagal disahkan.");
      setStage("done");
      setMessage("Pesanan percubaan direkodkan oleh API. Penghantaran WhatsApp belum disambungkan.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Ralat semasa menghantar pesanan."); }
  }

  return <main className="container">
    <header className="hero"><h1>Nasi Katok 3 Abdul</h1><p>Sistem pesanan • Pilih cawangan, sambal dan waktu ambil.</p></header>
    <div className="notice" style={{marginTop:16}}>Versi percubaan awal. Pesanan belum dihantar ke WhatsApp dan belum disimpan dalam pangkalan data kekal.</div>
    {stage === "order" && <>
      <section className="card"><h2>1. Maklumat pelanggan</h2>
        <label>Cawangan</label><select value={branch} onChange={e=>setBranch(e.target.value)}><option>Rimba</option><option>Telisai</option></select>
        <label>Nama pelanggan</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Masukkan nama anda" maxLength={80}/>
        <div className="row"><div><label>Tarikh ambil</label><input type="date" value={date} min={new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Brunei"})} onChange={e=>{setDate(e.target.value);setTime("");}}/></div><div><label>Waktu ambil</label><select value={time} onChange={e=>setTime(e.target.value)}><option value="">Pilih waktu</option>{slots.map(s=><option key={s}>{s}</option>)}</select></div></div>
        <p className="muted">Waktu operasi 10:00 pagi–5:00 petang. Tempahan memerlukan sekurang-kurangnya 30 minit persediaan.</p>
      </section>
      <section className="card"><h2>2. Pilih sambal</h2><p className="muted">Pilih 1 hingga 3 jenis sambal bagi setiap order line.</p>
        <div className="menu-grid">{SAMBALS.map(s=><label className="menu-option" key={s}><input type="checkbox" checked={selected.includes(s)} disabled={!selected.includes(s)&&selected.length>=3} onChange={e=>setSelected(prev=>e.target.checked?[...prev,s]:prev.filter(x=>x!==s))}/>{s}</label>)}</div>
        <label>Kuantiti (1–100; 0 bermaksud belum dipilih)</label><div className="qty"><button aria-label="Kurangkan kuantiti" onClick={()=>setQuantity(q=>Math.max(0,q-1))} disabled={quantity===0}>−</button><input type="number" min="0" max="100" step="1" value={quantity} onChange={e=>{const v=e.target.value;setQuantity(v===""?0:Math.max(0,Math.min(100,Math.floor(Number(v)||0))))}}/><button aria-label="Tambah kuantiti" onClick={()=>setQuantity(q=>Math.min(100,q+1))} disabled={quantity===100}>+</button></div>
        <div className="line"><span>Harga seunit</span><strong>{money(selected.length===3?1.5:selected.length>0?1:0)}</strong></div>
        <div className="line"><span>Jumlah baris ini</span><strong>{money(quantity*(selected.length===3?1.5:selected.length>0?1:0))}</strong></div>
        <button className="primary" onClick={addLine}>➕ Tambah Order</button>
        <button className="secondary" onClick={proceed}>Teruskan ke Add-on</button>
        <button className="secondary" onClick={()=>{setNoAddons(true);proceed();setStage("review");}}>Confirm Order — Tiada Add-on</button>
      </section>
      <section className="card"><h2>3. Senarai order</h2>{lines.length===0?<p className="muted">Belum ada order. Tambahkan kombinasi sambal di atas.</p>:lines.map((line,i)=><div className="line" key={line.id}><div><strong>{i+1}. {line.sambals.join(" + ")}</strong><div className="muted">Kuantiti {line.quantity} × {money(line.sambals.length===3?1.5:1)}</div><button className="secondary" onClick={()=>removeLine(line.id)}>Buang</button></div><strong>{money(line.quantity*(line.sambals.length===3?1.5:1))}</strong></div>)}<div className="line"><strong>Subtotal</strong><strong className="total">{money(subtotal)}</strong></div></section>
    </>}
    {stage === "addons" && <section className="card"><h2>3. Add-on</h2><label>Ayam Goreng — $1.00 setiap satu</label><div className="qty"><button onClick={()=>setAddonChicken(q=>Math.max(0,q-1))}>−</button><input type="number" min="0" max="100" value={addonChicken} onChange={e=>setAddonChicken(Math.max(0,Math.min(100,Number(e.target.value)||0)))}/><button onClick={()=>setAddonChicken(q=>Math.min(100,q+1))}>+</button></div><label>Nasi Putih — $0.50 setiap satu</label><div className="qty"><button onClick={()=>setAddonRice(q=>Math.max(0,q-1))}>−</button><input type="number" min="0" max="100" value={addonRice} onChange={e=>setAddonRice(Math.max(0,Math.min(100,Number(e.target.value)||0)))}/><button onClick={()=>setAddonRice(q=>Math.min(100,q+1))}>+</button></div><label>Extra Sambal</label><div className="row"><select value={extraType} onChange={e=>setExtraType(e.target.value)}>{SAMBALS.map(s=><option key={s}>{s}</option>)}</select><select value={extraPrice} onChange={e=>setExtraPrice(e.target.value)}>{Array.from({length:10},(_,i)=>(i+1)*.5).map(v=><option key={v} value={v.toFixed(2)}>{money(v)}</option>)}</select></div><button className="secondary" onClick={()=>{setNoAddons(true);setStage("review");}}>No, Thanks!</button><button className="primary" onClick={()=>{setNoAddons(false);setStage("review");}}>Teruskan ke Semakan</button></section>}
    {stage === "review" && <section className="card"><h2>Semakan pesanan</h2><p><strong>Cawangan:</strong> {branch}<br/><strong>Nama:</strong> {name}<br/><strong>Tarikh:</strong> {date}<br/><strong>Waktu ambil:</strong> {time}</p>{lines.map((l,i)=><div className="line" key={l.id}><span>{l.sambals.join(" + ")} × {l.quantity}</span><strong>{money(l.quantity*(l.sambals.length===3?1.5:1))}</strong></div>)}<div className="line"><span>Ayam Goreng × {noAddons?0:addonChicken}</span><strong>{money(noAddons?0:addonChicken)}</strong></div><div className="line"><span>Nasi Putih × {noAddons?0:addonRice}</span><strong>{money(noAddons?0:addonRice*.5)}</strong></div>{!noAddons&&<div className="line"><span>Extra Sambal {extraType}</span><strong>{money(Number(extraPrice))}</strong></div>}<div className="line"><strong>Jumlah keseluruhan</strong><strong className="total">{money(total)}</strong></div><button className="primary" onClick={confirm}>Sahkan Pesanan</button><button className="secondary" onClick={()=>setStage("order")}>Kembali / Edit</button><button className="secondary" onClick={()=>{setStage("order");setLines([]);setMessage("Pesanan dibatalkan.");}}>Batal Pesanan</button></section>}
    {stage === "done" && <section className="card"><h2>Pesanan direkodkan</h2><p>Terima kasih, {name}. Ini masih ujian sistem; tiada mesej WhatsApp dihantar.</p><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.6}}>New Order!{"\n\n"}&gt; Order For : {branch} Branch{"\n"}&gt; Nama : {name}{"\n"}&gt; Jam : {time}{"\n"}&gt; Tarikh : {date}{"\n"}{lines.map(l=>`- ${l.sambals.join(" + ")} x${l.quantity} — ${money(l.quantity*(l.sambals.length===3?1.5:1))}\n`).join("")}{noAddons?"\n> Add On's :\n- No, Thanks!\n":""}{"\n"}&gt; Jumlah Keseluruhan : {money(total)}{"\n\n"}Order Confirm! ✅</pre><button className="primary" onClick={()=>{setStage("order");setLines([]);setSelected([]);setQuantity(0);setAddonChicken(0);setAddonRice(0);setNoAddons(true);setTime("");setMessage("");}}>Mula Pesanan Baharu</button></section>}
    {message && <p role="status" className="card">{message}</p>}
    <footer className="muted" style={{textAlign:"center",padding:18}}>Nasi Katok 3 Abdul • Sistem percubaan</footer>
  </main>;
}
