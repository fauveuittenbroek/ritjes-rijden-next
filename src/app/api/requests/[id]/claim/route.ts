import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type ClaimedRow = {
  created_by: string;
  type: string;
  item_description: string | null;
  num_people: number | null;
  vertrekplaats: string;
  bestemming: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("claim_request", { _id: id });
  if (error) return NextResponse.json({ error: "claim_failed" }, { status: 400 });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM ?? "Ritjes Rijden <welkom@ritjes.com>";

    if (supabaseUrl && serviceKey && resendKey) {
      const claimed = data as ClaimedRow;
      const admin = createAdminClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: creatorData } = await admin.auth.admin.getUserById(claimed.created_by);
      const creatorEmail = creatorData.user?.email;

      if (creatorEmail) {
        const { data: profile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        const profileName = typeof profile?.display_name === "string" ? profile.display_name.trim() : "";
        const claimerName = profileName || user.email || "Onbekend";
        const people = claimed.num_people ?? "?";
        const title =
          claimed.item_description ||
          (claimed.type === "personen" ? `Rit voor ${people} ${people === 1 ? "persoon" : "personen"}` : "Goederen");

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [creatorEmail],
            subject: `Je opdracht "${title}" is geaccepteerd`,
            html: [
              "<h2>Goed nieuws!</h2>",
              `<p>Je opdracht <strong>${escapeHtml(title)}</strong> (${escapeHtml(claimed.vertrekplaats)} → ${escapeHtml(claimed.bestemming)}) is geaccepteerd door <strong>${escapeHtml(claimerName)}</strong>.</p>`,
              `<p>Contact: ${escapeHtml(user.email ?? "onbekend")}</p>`,
            ].join(""),
          }),
        });
      }
    }
  } catch {
  }

  return NextResponse.json({ ok: true });
}
