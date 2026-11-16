"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RideRequest, useFeatureAuth } from "@/components/feature-auth";

export default function FeedPage() {
  const { client, userId, loading, error: authError } = useFeatureAuth();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function load() {
      const rides = await client.from("requests").select("id,type,item_description,num_people,vertrekplaats,bestemming,status,created_at").order("created_at", { ascending: false });
      if (!active) return;
      if (rides.error) setError("Het overzicht laden is mislukt.");
      else setRequests((rides.data ?? []) as RideRequest[]);
      setPending(false);
    }
    load().catch(() => { if (active) { setError("Het overzicht laden is mislukt."); setPending(false); } });
    return () => { active = false; };
  }, [client, userId]);

  if (authError) return <main><p role="alert">{authError}</p></main>;
  if (loading || !userId) return <main><p>Laden…</p></main>;
  return <main className="page"><h1>Overzicht</h1>
    <nav><Link href="/rides">Alle ritjes</Link> {" · "}<Link href="/requests/new">Nieuw verzoek</Link> {" · "}<Link href="/account">Account</Link></nav>
    {error && <p role="alert">{error}</p>}
    {pending ? <p>Laden…</p> : <section><h2>Verzoeken</h2>
      {requests.length ? <ul>{requests.map(request => <li key={request.id}><Link href={`/rides/${request.id}`}>
        {request.type === "goederen" ? request.item_description || "Goederen" : `Rit voor ${request.num_people ?? "?"} personen`} — {request.vertrekplaats} → {request.bestemming} ({request.status === "open" ? "Open" : "Geaccepteerd"})
      </Link></li>)}</ul> : <p>Er zijn nog geen verzoeken.</p>}
    </section>}
  </main>;
}
