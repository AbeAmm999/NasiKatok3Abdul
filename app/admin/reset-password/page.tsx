"use client";

import { useEffect, useState } from "react";

export default function AdminResetPassword() {
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Mengesahkan pautan reset...");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("access_token");
    const type = params.get("type");
    if (token && type === "recovery") {
      setAccessToken(token);
      setMessage("Masukkan kata laluan baharu.");
    } else {
      setMessage("Pautan reset tidak sah atau telah tamat tempoh. Minta pautan reset yang baharu.");
    }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Kata laluan mesti sekurang-kurangnya 8 aksara.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Pengesahan kata laluan tidak sepadan.");
      return;
    }

    setBusy(true);
    try {
      const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!configuredUrl || !apiKey) throw new Error("Tetapan Supabase belum lengkap.");
      const baseUrl = configuredUrl.endsWith("/") ? configuredUrl.slice(0, -1) : configuredUrl;
      const response = await fetch(baseUrl + "/auth/v1/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
          Authorization: "Bearer " + accessToken,
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kata laluan gagal dikemaskini.");
      setMessage("Kata laluan berjaya ditukar. Anda boleh kembali ke halaman login Admin.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f4f5ef", fontFamily: "Arial, sans-serif", color: "#153d2c" }}>
      <section style={{ width: "min(100%, 430px)", background: "#fff", padding: 26, borderRadius: 18, border: "1px solid #d7c17b" }}>
        <h1>Reset Kata Laluan Admin</h1>
        <p>{message}</p>
        {accessToken && (
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <label>
              Kata laluan baharu
              <input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} style={{ display: "block", width: "100%", padding: 12, marginTop: 6, boxSizing: "border-box" }} />
            </label>
            <label>
              Sahkan kata laluan
              <input type="password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={{ display: "block", width: "100%", padding: 12, marginTop: 6, boxSizing: "border-box" }} />
            </label>
            <button disabled={busy} style={{ padding: 13, background: "#075537", color: "#fff", border: 0, borderRadius: 9 }}>
              {busy ? "Menyimpan..." : "Simpan kata laluan baharu"}
            </button>
          </form>
        )}
        <a href="/admin" style={{ display: "inline-block", marginTop: 18, color: "#075537" }}>Kembali ke Admin Login</a>
      </section>
    </main>
  );
}
