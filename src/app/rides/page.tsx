import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { matchesLocation } from "@/lib/rides";
import { RideThumb } from "@/components/ride-thumb";
import { HomeAuthButton, HomeAuthProvider } from "@/components/home-auth";
import { createClient } from "@/lib/supabase/server";
import { isStillVisible, loadPublicRides } from "@/lib/rides-server";

export const metadata: Metadata = { title: "Bekijk ritjes · Ritjes Rijden" };

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function RidesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    <HomeAuthProvider>
      <main>
        <header className="rides-head">
          <h1>
            <Link href="/" className="rides-brand">
              <Image src="/Ritjes_logo.jpeg" alt="Ritjes.com" width={240} height={160} className="rides-logo" priority />
            </Link>
          </h1>
          <div className="rides-head-actions">
            <Link className="rides-add" href="/requests/new">
              + Add
            </Link>
            {user ? (
              <>
                <Link className="site-auth-ghost" href="/account">Mijn account</Link>
                <Link className="site-auth-primary" href="/feed">Naar overzicht</Link>
              </>
            ) : (
              <>
                <HomeAuthButton mode="login" className="site-auth-ghost">Inloggen</HomeAuthButton>
                <HomeAuthButton mode="register" className="site-auth-primary">Account aanmaken</HomeAuthButton>
              </>
            )}
          </div>
        </header>

        <p className="rides-note">
          {user
            ? "Je bent ingelogd. Plaats een ritje of accepteer een verzoek."
            : (
              <>
                Je kunt alle ritjes bekijken zonder in te loggen. Om zelf een ritje te plaatsen of te accepteren moet je{" "}
                <HomeAuthButton mode="login" className="inline-link">ingelogd</HomeAuthButton> zijn.
              </>
            )}
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
    </HomeAuthProvider>
  );
}
