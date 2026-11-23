import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ google: false });

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ google: false });
    const settings = (await response.json()) as { external?: Record<string, boolean> };
    return NextResponse.json({ google: Boolean(settings.external?.google) });
  } catch {
    return NextResponse.json({ google: false });
  }
}
