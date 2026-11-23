import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, formatEuro, sendNotificationEmail } from "@/lib/email";

type RequestRow = {
  created_by: string;
  type: string;
  item_description: string | null;
  num_people: number | null;
  vertrekplaats: string;
  bestemming: string;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const body = await request.json().catch(() => null) as { amount?: unknown; message?: unknown } | null;
  const amount = Number(body?.amount);
  const message = typeof body?.message === "string" ? body.message.trim() : null;

  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000 || (message !== null && message.length > 280)) {
    return NextResponse.json({ error: "invalid_offer" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: offer, error } = await supabase.rpc("propose_offer", {
    _request_id: id,
    _amount: Math.round(amount * 100) / 100,
    _message: message,
  });
  if (error) {
    return NextResponse.json({ error: "counteroffer_failed" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: requestData } = await supabase
      .from("requests")
      .select("created_by,type,item_description,num_people,vertrekplaats,bestemming")
      .eq("id", id)
      .maybeSingle<RequestRow>();
    if (admin && requestData) {
      const [creatorResult, offererResult] = await Promise.all([
        admin.auth.admin.getUserById(requestData.created_by),
        admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      ]);
      const creatorEmail = creatorResult.data.user?.email;
      const profileName = typeof offererResult.data?.display_name === "string" ? offererResult.data.display_name.trim() : "";
      const offererName = profileName || user.email || "Iemand";
      const title = requestData.item_description || `Rit van ${requestData.vertrekplaats} naar ${requestData.bestemming}`;

      if (creatorEmail) {
        await sendNotificationEmail(
          creatorEmail,
          `Nieuw tegenvoorstel voor "${title}"`,
          [
            "<h2>Nieuw tegenvoorstel</h2>",
            `<p><strong>${escapeHtml(offererName)}</strong> stelt <strong>${escapeHtml(formatEuro(Number((offer as { amount: number }).amount)))}</strong> voor.</p>`,
            message ? `<p>Bericht: ${escapeHtml(message)}</p>` : "",
            `<p><a href="${siteUrl}/rides/${id}">Bekijk en beantwoord het voorstel</a></p>`,
          ].join(""),
        );
      }
    }
  } catch {
  }

  return NextResponse.json({ ok: true });
}
