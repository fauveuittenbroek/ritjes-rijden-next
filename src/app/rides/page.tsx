import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { matchesLocation } from "@/lib/rides";
import { RideThumb } from "@/components/ride-thumb";
import { isStillVisible, loadPublicRides } from "@/lib/rides-server";

export const metadata: Metadata = { title: "Bekijk ritjes · Ritjes Rijden" };

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function RidesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawQuery = params.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const rides = (await loadPublicRides())
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
            <Image src="/Ritjes.com_logo.png" alt="" width={64} height={64} className="rides-logo" priority />
            Ritjes.com
          </Link>
        </h1>
        <Link className="rides-add" href="/requests/new">
          + Add
        </Link>
      </header>

      <p className="rides-note">
        Je kunt alle ritjes bekijken zonder in te loggen. Om zelf een ritje te plaatsen of te accepteren moet je{" "}
        <Link href="/login">ingelogd</Link> zijn.
      </p>

      <form className="rides-search" action="/rides" method="get" role="search">
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
