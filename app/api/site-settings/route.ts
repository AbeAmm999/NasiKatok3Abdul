import { NextResponse } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET() {
  const url=process.env.SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url || !secret) return NextResponse.json({ok:false,error:"Tetapan tidak tersedia."},{status:503});
  const response=await fetch(`${url.replace(/\\/$/,"")}/rest/v1/website_settings?id=eq.true&select=settings,updated_at`,{
    headers:{apikey:secret,Authorization:`Bearer ${secret}`},cache:"no-store"
  });
  const rows=await response.json();
  if(!response.ok || !rows?.[0]) return NextResponse.json({ok:false,error:"Tetapan tidak tersedia."},{status:502});
  return NextResponse.json({ok:true,settings:rows[0].settings,updatedAt:rows[0].updated_at},{headers:{"Cache-Control":"no-store, max-age=0"}});
}
