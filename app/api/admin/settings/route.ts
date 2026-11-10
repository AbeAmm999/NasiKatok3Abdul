import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!token || !url || !secret || !publishable || !admins.length) return null;
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: publishable, Authorization: `Bearer ${token}` }, cache: "no-store"
  });
  if (!response.ok) return null;
  const user = await response.json();
  if (typeof user.email !== "string" || !admins.includes(user.email.toLowerCase())) return null;
  return { url: url.replace(/\/$/, ""), secret, email: user.email };
}
const err=(message:string,status:number)=>NextResponse.json({ok:false,error:message},{status});

export async function GET(request:Request) {
  const auth=await authorize(request);
  if(!auth) return err("Akses admin tidak dibenarkan.",401);
  const response=await fetch(`${auth.url}/rest/v1/website_settings?id=eq.true&select=settings,updated_at,updated_by`,{
    headers:{apikey:auth.secret,Authorization:`Bearer ${auth.secret}`},cache:"no-store"
  });
  const rows=await response.json();
  if(!response.ok || !rows?.[0]) return err("Tetapan website tidak dapat dimuatkan.",502);
  return NextResponse.json({ok:true,...rows[0]});
}

export async function PUT(request:Request) {
  const auth=await authorize(request);
  if(!auth) return err("Akses admin tidak dibenarkan.",401);
  const body=await request.json().catch(()=>null);
  if(!body || typeof body.settings!=="object" || Array.isArray(body.settings)) return err("Format tetapan tidak sah.",400);
  const allowedTopLevel=new Set(["siteEnabled","orderingEnabled","announcement","language","branches","hours","images","prices","sambals","addons","orderRules"]);
  if(Object.keys(body.settings).some(k=>!allowedTopLevel.has(k))) return err("Tetapan mengandungi medan yang tidak dibenarkan.",400);
  const currentResponse=await fetch(`${auth.url}/rest/v1/website_settings?id=eq.true&select=settings`,{
    headers:{apikey:auth.secret,Authorization:`Bearer ${auth.secret}`},cache:"no-store"
  });
  const currentRows=await currentResponse.json();
  if(!currentResponse.ok || !currentRows?.[0]) return err("Tetapan sedia ada tidak dapat dibaca.",502);
  const oldSettings=currentRows[0].settings || {};
  const merged={...oldSettings,...body.settings};
  const save=await fetch(`${auth.url}/rest/v1/website_settings?id=eq.true`,{
    method:"PATCH",
    headers:{apikey:auth.secret,Authorization:`Bearer ${auth.secret}`,"Content-Type":"application/json",Prefer:"return=representation"},
    body:JSON.stringify({settings:merged,updated_at:new Date().toISOString(),updated_by:auth.email}),
    cache:"no-store"
  });
  const saved=await save.json();
  if(!save.ok) return err("Tetapan gagal disimpan.",502);
  await fetch(`${auth.url}/rest/v1/website_settings_audit`,{
    method:"POST",
    headers:{apikey:auth.secret,Authorization:`Bearer ${auth.secret}`,"Content-Type":"application/json"},
    body:JSON.stringify({changed_by:auth.email,changes:{updatedKeys:Object.keys(body.settings)}}),
    cache:"no-store"
  });
  return NextResponse.json({ok:true,settings:saved?.[0]?.settings || merged});
}
