import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RideOffer = {
  id: string;
  status: "proposed" | "accepted" | "declined" | "withdrawn";
  amount: number;
  message: string | null;
  offeredBy: string;
  offererName: string | null;
  createdAt: string;
};

export function offerStatusLabel(status: RideOffer["status"]): string {
  return status === "proposed" ? "Open" : status === "accepted" ? "Geaccepteerd" : status === "declined" ? "Gewijgerd" : "Ingetrokken";
}

export async function loadRideOffers(requestId: string): Promise<RideOffer[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: rows } = await supabase
      .from("request_offers")
      .select("id,status,amount,message,offered_by,created_at")
      .eq("request_id", requestId)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!rows?.length) return [];

    const offers: RideOffer[] = rows.map((row) => ({
      id: row.id,
      status: row.status,
      amount: Number(row.amount),
      message: row.message ?? null,
      offeredBy: row.offered_by,
      offererName: null,
      createdAt: row.created_at,
    }));

    const admin = createAdminClient();
    if (admin) {
      const ids = [...new Set(offers.map((offer) => offer.offeredBy))];
      const { data: profiles } = await admin.from("profiles").select("id,display_name").in("id", ids);
      const names = new Map(
        (profiles ?? [])
          .map((profile) => ({ id: profile.id, name: typeof profile.display_name === "string" ? profile.display_name.trim() : "" }))
          .filter((profile) => profile.name)
          .map((profile) => [profile.id, profile.name] as const),
      );
      for (const offer of offers) offer.offererName = names.get(offer.offeredBy) ?? null;
    }

    return offers;
  } catch {
    return [];
  }
}
