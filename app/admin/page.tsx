"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Item = { id: string; sambals: string[]; extra_sambals: string[]; quantity: number; unit_price: number; line_total: number };
type Order = {
  id: string; order_number: string; customer_name: string; branch: "Rimba" | "Telisai";
  pickup_date: string; pickup_time: string; status: string; subtotal: number; addon_total: number;
  total: number; special_notes: string | null; addons: { type: string; name: string; quantity: number; unitPrice: number }[];
  created_at: string; order_items: Item[];
};
const statuses = ["pending", "accepted", "preparing", "ready", "completed", "rejected", "cancelled"];
const labels: Record<string,string> = { pending:"Pending", accepted:"Accepted", preparing:"Preparing", ready:"Ready", completed:"Completed", rejected:"Rejected", cancelled:"Cancelled" };
const money = (n: number | string) => `BND $${Number(n || 0).toFixed(2)}`;

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("nk3_admin_access_token") || "";
    setToken(saved);
    setReady(true);
  }, []);

  const loadOrders = useCallback(async (accessToken: string) => {
    setBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (branch) params.set("branch", branch);
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Tidak dapat memuatkan pesanan.");
      setOrders(data.orders || []);
      setSelected((current) => current ? (data.orders || []).find((o: Order) => o.id === current.id) || null : null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ralat tidak diketahui.");
      if (e instanceof Error && e.message.toLowerCase().includes("log masuk")) {
        sessionStorage.removeItem("nk3_admin_access_token");
        setToken("");
      }
    } finally { setBusy(false); }
  }, [branch, status, search]);

  useEffect(() => {
    if (token) void loadOrders(token);
  }, [token, loadOrders]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error("Tetapan Supabase belum lengkap.");
      const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok || !data.access_token) throw new Error("Log masuk gagal. Semak e-mel dan kata laluan.");
      sessionStorage.setItem("nk3_admin_access_token", data.access_token);
      setPassword("");
      setToken(data.access_token);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Log masuk gagal.");
    } finally { setBusy(false); }
  }

  function logout() {
    sessionStorage.removeItem("nk3_admin_access_token");
    setToken(""); setOrders([]); setSelected(null); setMessage("");
  }

  async function updateStatus(order: Order, nextStatus: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: order.id, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Kemaskini gagal.");
      setMessage(`Status ${order.order_number} dikemaskini kepada ${labels[nextStatus]}.`);
      await loadOrders(token);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kemaskini gagal.");
    } finally { setBusy(false); }
  }

  const counts = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready: orders.filter(o => o.status === "ready").length,
  }), [orders]);

  if (!ready) return <main className="admin-shell"><p>Memuatkan...</p></main>;

  if (!token) return (
    <main className="admin-shell">
      <section className="login-card">
        <div className="brand-mark">NK3A</div>
        <p className="eyebrow">PANEL PENGURUSAN</p>
        <h1>Admin Login</h1>
        <p className="muted">Nasi Katok 3 Abdul</p>
        <form onSubmit={login}>
          <label>E-mel admin</label>
          <input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="admin@example.com"/>
          <label>Kata laluan</label>
          <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Kata laluan Supabase Auth"/>
          <button disabled={busy}>{busy ? "Sedang log masuk..." : "Log Masuk"}</button>
        </form>
        {message && <p className="notice error">{message}</p>}
        <p className="small muted">Akses hanya diberikan kepada akaun yang disenaraikan sebagai admin.</p>
        <a href="/">← Kembali ke halaman pesanan</a>
      </section>
      <style jsx>{styles}</style>
    </main>
  );

  return (
    <main className="admin-shell">
      <header className="topbar">
        <div><div className="brand-mark small-mark">NK3A</div><div><p className="eyebrow">PANEL PENGURUSAN</p><h1>Admin Dashboard</h1></div></div>
        <button className="logout" onClick={logout}>Log Keluar</button>
      </header>
      <section className="stats">
        <article><span>Pesanan dipaparkan</span><strong>{counts.total}</strong></article>
        <article><span>Pending</span><strong>{counts.pending}</strong></article>
        <article><span>Preparing</span><strong>{counts.preparing}</strong></article>
        <article><span>Ready</span><strong>{counts.ready}</strong></article>
      </section>
      <section className="filters">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nombor pesanan atau nama..."/>
        <select value={branch} onChange={e=>setBranch(e.target.value)}><option value="">Semua cawangan</option><option>Rimba</option><option>Telisai</option></select>
        <select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Semua status</option>{statuses.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select>
        <button className="refresh" onClick={()=>void loadOrders(token)} disabled={busy}>↻ Muat semula</button>
      </section>
      {message && <p className="notice">{message}</p>}
      <div className="dashboard-grid">
        <section className="orders-panel">
          <div className="panel-heading"><h2>Senarai Pesanan</h2><span>{orders.length} rekod terakhir</span></div>
          {busy && <p className="muted">Memuatkan...</p>}
          {!busy && orders.length===0 && <p className="empty">Tiada pesanan ditemui.</p>}
          {orders.map(order=>(
            <button key={order.id} className={`order-row ${selected?.id===order.id?"active":""}`} onClick={()=>setSelected(order)}>
              <div className="row-main"><strong>{order.order_number}</strong><span className={`status ${order.status}`}>{labels[order.status] || order.status}</span></div>
              <div className="row-sub"><span>{order.customer_name} · {order.branch}</span><strong>{money(order.total)}</strong></div>
              <small>{order.pickup_date} · {order.pickup_time}</small>
            </button>
          ))}
        </section>
        <section className="detail-panel">
          {!selected ? <div className="empty detail-empty">Pilih pesanan untuk melihat butiran.</div> : <>
            <div className="panel-heading"><div><p className="eyebrow">BUTIRAN PESANAN</p><h2>{selected.order_number}</h2></div><span className={`status ${selected.status}`}>{labels[selected.status]}</span></div>
            <div className="detail-pair"><span>Nama pelanggan</span><strong>{selected.customer_name}</strong></div>
            <div className="detail-pair"><span>Cawangan</span><strong>{selected.branch}</strong></div>
            <div className="detail-pair"><span>Tarikh ambil</span><strong>{selected.pickup_date}</strong></div>
            <div className="detail-pair"><span>Waktu ambil</span><strong>{selected.pickup_time}</strong></div>
            <h3>Senarai item</h3>
            {(selected.order_items || []).map((item,i)=><div className="item-line" key={item.id}><div><strong>{i+1}. {(item.sambals || []).join(" + ") || "Item"}</strong><small>Kuantiti: {item.quantity}{item.extra_sambals?.length ? ` · Extra: ${item.extra_sambals.join(", ")}` : ""}</small></div><strong>{money(item.line_total)}</strong></div>)}
            {(selected.addons || []).length>0 && <><h3>Add On's</h3>{selected.addons.map((a,i)=><div className="item-line" key={i}><span>{a.name} × {a.quantity}</span><strong>{money(a.unitPrice*a.quantity)}</strong></div>)}</>}
            {selected.special_notes && <div className="notes"><strong>Catatan</strong><p>{selected.special_notes}</p></div>}
            <div className="totals"><div><span>Subtotal</span><strong>{money(selected.subtotal)}</strong></div><div><span>Add On's</span><strong>{money(selected.addon_total)}</strong></div><div className="grand"><span>Jumlah</span><strong>{money(selected.total)}</strong></div></div>
            <label className="status-label">Kemaskini status</label>
            <select value={selected.status} onChange={e=>void updateStatus(selected,e.target.value)} disabled={busy}>{statuses.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select>
          </>}
        </section>
      </div>
      <p className="footer-note">Data pesanan dipaparkan daripada Supabase. Semak semula status sebelum mengesahkan pesanan kepada pelanggan.</p>
      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .admin-shell{min-height:100vh;background:#f4f5ef;color:#153d2c;padding:22px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
  .login-card{max-width:430px;margin:7vh auto;background:#fff;border:1px solid #d7c17b;border-radius:20px;padding:30px;box-shadow:0 14px 38px #163b2514}
  .brand-mark{display:inline-grid;place-items:center;background:#075537;color:#f8d35a;border:2px solid #c9a441;border-radius:13px;padding:10px 16px;font-weight:900;letter-spacing:1px}
  .small-mark{font-size:14px;padding:8px 11px}
  .eyebrow{font-size:11px;letter-spacing:1.8px;font-weight:800;color:#9b7924;margin:15px 0 5px}
  h1{font-size:27px;margin:0 0 5px}h2{font-size:20px;margin:0}h3{font-size:15px;margin:20px 0 9px}
  .muted,.small{color:#738078}.small{font-size:12px;line-height:1.5}
  form{display:grid;gap:10px;margin-top:22px}label{font-size:13px;font-weight:700}
  input,select{width:100%;min-width:0;padding:12px;border:1px solid #d5ddd5;border-radius:10px;background:#fff;color:#173326;font:inherit;box-sizing:border-box}
  button{border:0;border-radius:10px;padding:12px 15px;background:#075537;color:#fff;font-weight:700;cursor:pointer}
  button:disabled{opacity:.6;cursor:wait}
  form button{margin-top:8px;background:#075537;border:1px solid #c9a441}
  a{display:inline-block;margin-top:18px;color:#075537;font-weight:700;text-decoration:none}
  .topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:0 auto 22px;max-width:1400px}
  .topbar>div{display:flex;align-items:center;gap:14px}.topbar .eyebrow{margin:0 0 4px}
  .logout{background:#fff;color:#17432f;border:1px solid #d7c17b}
  .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;max-width:1400px;margin:0 auto 16px}
  .stats article{background:#fff;border:1px solid #e2e6dd;border-radius:14px;padding:17px;display:grid;gap:8px}
  .stats span,.detail-pair span{font-size:12px;color:#758078}.stats strong{font-size:27px}
  .filters{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;max-width:1400px;margin:0 auto 16px}
  .refresh{white-space:nowrap}
  .notice{max-width:1400px;margin:0 auto 14px;padding:12px 14px;border-radius:10px;background:#fff7dd;border:1px solid #e5cc75;color:#6c5315}
  .error{margin-top:15px;color:#8f3026;background:#fff0ed;border-color:#e3b6af}
  .dashboard-grid{display:grid;grid-template-columns:minmax(280px, .95fr) minmax(0,1.4fr);gap:16px;max-width:1400px;margin:auto;align-items:start}
  .orders-panel,.detail-panel{background:#fff;border:1px solid #e1e6dc;border-radius:15px;padding:16px;min-width:0}
  .panel-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}.panel-heading>span{font-size:12px;color:#778078}
  .order-row{display:block;text-align:left;width:100%;margin:0 0 8px;padding:13px;background:#fbfcf8;color:#183c2b;border:1px solid #e4e8df;border-radius:11px}
  .order-row.active{border:2px solid #c9a441;background:#fffaf0}
  .row-main,.row-sub{display:flex;justify-content:space-between;gap:8px;align-items:center}.row-sub{font-size:13px;margin:8px 0 5px}.order-row small{font-size:11px;color:#7b857e}
  .status{font-size:11px;font-weight:800;padding:5px 8px;border-radius:20px;background:#edf0ec;color:#55645a;white-space:nowrap}
  .status.pending{background:#fff3d3;color:#805d08}.status.accepted{background:#e5f0ff;color:#245b94}.status.preparing{background:#e9e3ff;color:#6048a1}.status.ready{background:#dff5e8;color:#167344}.status.completed{background:#e5eee8;color:#3e6250}.status.rejected,.status.cancelled{background:#ffebe8;color:#a43b30}
  .empty{padding:28px 12px;text-align:center;color:#7b857e}.detail-empty{min-height:200px;display:grid;place-items:center}
  .detail-pair{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #edf0ea;font-size:14px}
  .item-line{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #edf0ea;font-size:13px}.item-line small{display:block;color:#778078;margin-top:4px}
  .notes{background:#fff9e8;border:1px solid #eee0b3;border-radius:10px;padding:12px;margin-top:15px}.notes p{margin:6px 0 0;white-space:pre-wrap}
  .totals{margin-top:15px;border-top:1px solid #e5e9e1;padding-top:10px}.totals>div{display:flex;justify-content:space-between;padding:6px 0}.grand{font-size:18px;border-top:1px solid #e5e9e1;margin-top:5px;padding-top:12px!important}
  .status-label{display:block;margin:18px 0 7px}.footer-note{max-width:1400px;margin:18px auto;color:#778078;font-size:12px}
  @media(max-width:760px){.admin-shell{padding:13px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{grid-template-columns:1fr 1fr}.filters input{grid-column:1/-1}.refresh{grid-column:1/-1}.dashboard-grid{grid-template-columns:1fr}.topbar h1{font-size:21px}.login-card{padding:22px}}
`;
