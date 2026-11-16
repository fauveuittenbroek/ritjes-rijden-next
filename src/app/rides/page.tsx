import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  DEMO_RIDES,
  PUBLIC_REQUEST_COLUMNS,
  REQUEST_COLUMNS_WITHOUT_PHOTO,
  Ride,
  matchesQuery,
  rideFromRequest,
} from "@/lib/rides";
import { RideThumb } from "@/components/ride-thumb";
import { publicPhotoUrl } from "@/lib/rides-server";

export const metadata: Metadata = { title: "Bekijk ritjes · Ritjes Rijden" };

type SearchParams = Promise<{ q?: string | string[] }>;
type RideRow = Parameters<typeof rideFromRequest>[0];

async function loadPublicRides(): Promise<Ride[]> {
  try {
    const supabase = await createClient();
    let rows: RideRow[] | null;
    const primary = await supabase
      .from("requests")
      .select(PUBLIC_REQUEST_COLUMNS)
      .in("status", ["open", "claimed"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (primary.error) {
      const fallback = await supabase
        .from("requests")
        .select(REQUEST_COLUMNS_WITHOUT_PHOTO)
        .in("status", ["open", "claimed"])
        .order("created_at", { ascending: false })
        .limit(100);
      rows = fallback.data;
    } else {
      rows = primary.data;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const rides = (rows ?? []).map((row) => rideFromRequest(row));
    const photoPaths = rides.flatMap((ride) => (ride.photoPath ? [ride.photoPath] : []));
    const signedUrls = new Map<string, string>();
    if (user && photoPaths.length) {
      const { data: signed } = await supabase.storage.from("request-photos").createSignedUrls(photoPaths, 60 * 60);
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
      }
    }
    for (const ride of rides) {
      if (!ride.photoPath) continue;
      ride.image = signedUrls.get(ride.photoPath) ?? publicPhotoUrl(ride.photoPath);
    }
    return rides;
  } catch {
    return [];
  }
}

function isStillVisible(ride: Ride): boolean {
  if (ride.status === "open" || !ride.deadline) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return ride.deadline >= cutoff.toISOString().slice(0, 10);
}

export default async function RidesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawQuery = params.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const rides = [...DEMO_RIDES, ...(await loadPublicRides())]
    .filter(isStillVisible)
    .filter((ride) => matchesQuery(ride, query))
    .sort((a, b) => {
      const statusOrder = Number(a.status !== "open") - Number(b.status !== "open");
      if (statusOrder !== 0) return statusOrder;
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <main>
      <header className="rides-head">
        <h1>🚗 Vervoer-verzoeken</h1>
        <Link className="rides-add" href="/requests/new">
          + Add
        </Link>
      </header>

      <p className="rides-note">
        Je kunt alle ritjes bekijken zonder in te loggen. Om zelf een ritje te plaatsen of te accepteren moet je{" "}
        <Link href="/login">ingelogd</Link> zijn.
      </p>

      <form className="rides-search" action="/rides" method="get" role="search">
        <input type="search" name="q" defaultValue={query} placeholder="Zoek" aria-label="Zoek ritjes" />
        <button type="submit">Zoek</button>
      </form>

      {rides.length ? (
        <div className="rides-grid">
          {rides.map((ride) => (
            <Link key={ride.id} href={`/rides/${ride.id}`} className="ride-card">
              {ride.status !== "open" && <span className="ride-status ride-status-claimed">Geaccepteerd</span>}
              <RideThumb icon={ride.icon} image={ride.image} title={ride.title} />
              <span className="ride-category">{ride.title}</span>
              <span className="ride-origin">{ride.origin}</span>
              <span className="ride-destination">{ride.destination}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="ride-empty">Geen ritjes gevonden{query ? ` voor “${query}”` : ""}.</p>
      )}
    </main>
  );
}
