import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, formatEuro, sendNotificationEmail } from "@/lib/email";

type Action = "accept" | "decline" | "withdraw";

function isAction(value: unknown): value is Action {
  return value === "accept" || value === "decline" || value === "withdraw";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (!isAction(body?.action)) return NextResponse.json({ error: "invalid_action" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: offer } = await supabase
    .from("request_offers")
    .select("id,request_id,amount,offered_by,status")
    .eq("id", id)
    .maybeSingle();
  if (!offer) return NextResponse.json({ error: "offer_not_found" }, { status: 404 });

  if (body.action === "withdraw") {
    const { error } = await supabase.rpc("withdraw_offer", { _offer_id: id });
    if (error) return NextResponse.json({ error: "withdraw_failed" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.rpc("respond_to_offer", {
    _offer_id: id,
    _accept: body.action === "accept",
  });
  if (error) return NextResponse.json({ error: "response_failed" }, { status: 400 });

  if (body.action !== "accept") return NextResponse.json({ ok: true });

  try {
    const admin = createAdminClient();
    const [offererResult, requesterData] = await Promise.all([
      admin?.auth.admin.getUserById(offer.offered_by),
      supabase
        .from("requests")
        .select("item_description,type,num_people,vertrekplaats,bestemming")
        .eq("id", offer.request_id)
        .maybeSingle<{
          item_description: string | null;
          type: string;
          num_people: number | null;
          vertrekplaats: string;
          bestemming: string;
        }>(),
    ]);
    const offererEmail = offererResult?.data.user?.email;
    const title = requesterData.data?.item_description || `Rit van ${requesterData.data?.vertrekplaats ?? ""} naar ${requesterData.data?.bestemming ?? ""}`;

    if (offererEmail) {
      await sendNotificationEmail(
        offererEmail,
        `Je tegenvoorstel voor "${title}" is geaccepteerd`,
        [
          "<h2>Gefeliciteerd</h2>",
          `<p>Je tegenvoorstel van <strong>${escapeHtml(formatEuro(Number(offer.amount)))}</strong> voor <strong>${escapeHtml(title)}</strong> is geaccepteerd.</p>`,
          `<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ritjes.com"}/rides/${offer.request_id}">Bekijk het ritje</a></p>`,
        ].join(""),
      );
    }
  } catch {
  }

  return NextResponse.json({ ok: true });
}
