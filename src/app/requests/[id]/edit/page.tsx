import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSiteAccess } from "@/lib/access";
import { AUTH_REQUEST_COLUMNS, rideFromRequest } from "@/lib/rides";
import { EditRequestForm } from "@/components/edit-request-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Verzoek wijzigen · Ritjes Rijden" };

type Params = Promise<{ id: string }>;

export default async function EditRequestPage({ params }: { params: Params }) {
  const { id } = await params;
  const access = await requireSiteAccess(`/requests/${id}/edit`);
  const supabase = await createClient();
  const user = { id: access.userId };

  const { data, error } = await supabase.from("requests").select(AUTH_REQUEST_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data || data.created_by !== user.id || data.status !== "open") notFound();

  const ride = rideFromRequest(data);
  const { data: addressRows } = await supabase.rpc("get_request_addresses", { _id: id });
  const addresses = Array.isArray(addressRows) ? addressRows[0] : null;
  ride.pickupAddress = addresses?.ophaaladres ?? null;
  ride.deliveryAddress = addresses?.afleveradres ?? null;

  return (
    <>
      <SiteHeader />
      <main>
        <Link href={`/rides/${ride.id}`}>← Terug naar ritje</Link>
        <h1>Verzoek wijzigen</h1>
        <p>Alleen het type blijft hetzelfde.</p>
        <EditRequestForm
          requestId={ride.id}
          initial={{
            type: ride.type,
            itemDescription: ride.itemDescription ?? null,
            numPeople: ride.numPeople,
            note: ride.description,
            vertrekplaats: ride.origin,
            bestemming: ride.destination,
            ophaaladres: ride.pickupAddress,
            afleveradres: ride.deliveryAddress,
            reward: ride.reward,
            scheduledAt: ride.scheduledAt,
            deadline: ride.deadline,
            contactName: ride.contactName ?? null,
            photoPath: ride.photoPath ?? null,
          }}
        />
      </main>
    </>
  );
}
