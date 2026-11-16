import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { matchesQuery } from "@/lib/rides";
import { RideThumb } from "@/components/ride-thumb";
import { isStillVisible, loadPublicRides } from "@/lib/rides-server";

export const metadata: Metadata = { title: "Overzicht · Ritjes Rijden" };

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const rawQuery = params.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const rides = (await loadPublicRides({ supabase, userId: user.id }))
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
        <h1>Overzicht</h1>
        <nav className="ride-actions">
          <Link href="/requests/new" className="button-primary">Nieuw verzoek</Link>
          <Link href="/account" className="button-secondary">Account</Link>
        </nav>
      </header>

      <form className="rides-search" action="/feed" method="get" role="search">
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
