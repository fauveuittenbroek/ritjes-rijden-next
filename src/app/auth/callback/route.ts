import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function callbackError(origin: string, reason: string) {
  const destination = new URL("/login", origin);
  destination.searchParams.set("error", "auth");
  destination.searchParams.set("reason", reason);
  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("error")) return callbackError(url.origin, "provider");

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/feed";
  if (!code) return callbackError(url.origin, "missing_code");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const rawCode = (error as { code?: unknown }).code;
      const errorCode = typeof rawCode === "string" ? rawCode : "";
      console.error("OAuth callback exchange failed", {
        name: error.name,
        code: errorCode,
        status: (error as { status?: unknown }).status,
      });
      const reason = /verifier|flow_state|pkce/i.test(`${errorCode} ${error.message}`) ? "session" : "exchange";
      return callbackError(url.origin, reason);
    }
    return NextResponse.redirect(new URL(destination, url.origin));
  } catch (error) {
    console.error("OAuth callback failed unexpectedly", error instanceof Error ? error.name : "unknown");
    return callbackError(url.origin, "exchange");
  }
}
