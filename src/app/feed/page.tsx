import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireSiteAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { matchesLocation } from "@/lib/rides";
import { RideThumb } from "@/components/ride-thumb";
import { isStillVisible, loadPublicRides } from "@/lib/rides-server";

export const metadata: Metadata = { title: "Overzicht · Ritjes Rijden" };

type SearchParams = Promise<{ q?: string | string[]; confirmed?: string | string[] }>;

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await requireSiteAccess("/feed");
  const supabase = await createClient();
  const params = await searchParams;
  const rawQuery = params.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const rawConfirmed = params.confirmed;
  const confirmed = (Array.isArray(rawConfirmed) ? rawConfirmed[0] : rawConfirmed) === "1";
  const rides = (await loadPublicRides({ supabase, userId: access.userId }))
    .filter(isStillVisible)
    .filter((ride) => matchesLocation(ride, query))
    .sort((a, b) => {
      const statusOrder = Number(a.status !== "open") - Number(b.status !== "open");
      if (statusOrder !== 0) return statusOrder;
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <main>
      <header className="rides-head">
        <h1>
          <Link href="/" className="rides-brand">
            <Image src="/Ritjes_logo.jpeg" alt="Ritjes.com" width={240} height={160} className="rides-logo" priority />
            Overzicht
          </Link>
        </h1>
        <nav className="ride-actions">
          <Link href="/rides" className="plain-nav-link">Bekijk ritjes</Link>
          <Link href="/requests/new" className="button-primary">Nieuw verzoek</Link>
          <Link href="/account" className="button-secondary">Account</Link>
        </nav>
      </header>
      {confirmed && <p className="rides-note" role="status">Je e-mailadres is bevestigd. Je bent nu ingelogd op dit apparaat.</p>}

      <form className="rides-search" action="/feed" method="get" role="search">
        <input type="search" name="q" defaultValue={query} placeholder="Zoek op vertrek- of aankomstlocatie" aria-label="Zoek op locatie" />
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
