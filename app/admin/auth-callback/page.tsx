"use client";

import { useEffect, useState } from "react";

export default function AdminAuthCallbackPage() {
  const [message, setMessage] = useState("Completing account confirmation...");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const error = hash.get("error_description") || query.get("error_description") || hash.get("error") || query.get("error");
    if (error) {
      setMessage(decodeURIComponent(error.replace(/\+/g, " ")));
      return;
    }
    const accessToken = hash.get("access_token");
    if (accessToken) {
      sessionStorage.setItem("nk3_admin_access_token", accessToken);
      window.location.replace("/admin");
      return;
    }
    setMessage("Confirmation received. Please sign in again if you are not redirected.");
  }, []);

  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f4f5ef",padding:24,color:"#153d2c",fontFamily:"Arial,Helvetica,sans-serif"}}>
    <section style={{maxWidth:460,width:"100%",background:"#fff",border:"1px solid #d7c17b",borderRadius:16,padding:24,textAlign:"center"}}>
      <h1 style={{fontSize:22}}>Nasi Katok 3 Abdul</h1>
      <p>{message}</p>
      <a href="/admin" style={{color:"#075537",fontWeight:700}}>Return to Admin</a>
    </section>
  </main>;
}
