import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Claim-historie · Ritjes Rijden" };

export default async function AdminPage() {
  const supabase = await createClient();
  const [authResult, adminResult, eventsResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("is_admin"),
    supabase
      .from("request_events")
      .select("id,event_type,actor_email,request_title,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const user = authResult.data.user;
  if (!user) redirect("/login");

  if (!adminResult.data) {
    return (
      <>
        <SiteHeader />
        <main>
          <Link href="/">Terug naar home</Link>
          <h1>Geen toegang</h1>
          <p>Deze pagina is alleen voor beheerders.</p>
        </main>
      </>
    );
  }

  const events = eventsResult.data;

  return (
    <>
      <SiteHeader />
      <main>
        <Link href="/feed">Terug naar overzicht</Link>
        <h1>Claim-historie</h1>
        {events?.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Gebeurtenis</th>
                <th>Verzoek</th>
                <th>Gebruiker</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.created_at as string).toLocaleString("nl-NL")}</td>
                  <td>{({
                    claimed: "Geaccepteerd",
                    released: "Vrijgegeven",
                    edited: "Gewijzigd",
                    offer_proposed: "Tegenvoorstel gedaan",
                    offer_accepted: "Tegenvoorstel geaccepteerd",
                    offer_declined: "Tegenvoorstel geweigerd",
                  } as Record<string, string>)[event.event_type] ?? event.event_type}</td>
                  <td>{event.request_title ?? "—"}</td>
                  <td>{event.actor_email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Nog geen gebeurtenissen.</p>
        )}
      </main>
    </>
  );
}
