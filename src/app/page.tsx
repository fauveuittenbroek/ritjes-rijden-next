import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeAuthButton, HomeAuthProvider } from "@/components/home-auth";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_REQUEST_COLUMNS, Ride, rideFromRequest } from "@/lib/rides";

export const metadata: Metadata = {
  title: "Ritjes.com · Iets te vervoeren? Iemand rijdt al jouw kant op.",
  description:
    "Plaats een vervoersverzoek voor spullen of personen, of help iemand onderweg. Bekijk ritjes gratis en zonder account.",
};

const FALLBACK_RIDES: Ride[] = [
  {
    id: "voorbeeld-nikes",
    type: "goederen",
    title: "Nikes",
    icon: "👟",
    origin: "Nieuwer Ter Aa",
    destination: "Bodegraven",
    description: null,
    numPeople: null,
    pickupAddress: null,
    deliveryAddress: null,
    reward: 20,
    scheduledAt: null,
    deadline: null,
    status: "claimed",
    createdAt: new Date().toISOString(),
  },
  {
    id: "voorbeeld-co-sleeper",
    type: "goederen",
    title: "Co-sleeper met matras",
    icon: "🛏️",
    origin: "Zoetermeer",
    destination: "Nieuwer Ter Aa",
    description: "Houten co-sleeper inclusief matras.",
    numPeople: null,
    pickupAddress: null,
    deliveryAddress: null,
    reward: null,
    scheduledAt: null,
    deadline: null,
    status: "open",
    createdAt: new Date().toISOString(),
  },
  {
    id: "voorbeeld-techniek",
    type: "goederen",
    title: "Techniek spullen",
    icon: "📦",
    origin: "Nieuwer Ter Aa",
    destination: "Den Haag",
    description: null,
    numPeople: null,
    pickupAddress: null,
    deliveryAddress: null,
    reward: null,
    scheduledAt: null,
    deadline: null,
    status: "open",
    createdAt: new Date().toISOString(),
  },
];

function formatReward(reward: number | null): string | null {
  if (reward == null) return null;
  return `€ ${reward.toFixed(2).replace(".", ",")}`;
}

function statusLabel(status: string): string {
  return status === "claimed" ? "Geaccepteerd" : "Nieuw";
}

async function loadHomeRides(): Promise<{ rides: Ride[]; count: number; signedIn: boolean }> {
  try {
    const supabase = await createClient();
    const [recent, totals, auth] = await Promise.all([
      supabase
        .from("requests")
        .select(PUBLIC_REQUEST_COLUMNS)
        .in("status", ["open", "claimed"])
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("requests").select("id", { count: "exact", head: true }).in("status", ["open", "claimed"]),
      supabase.auth.getUser(),
    ]);
    return {
      rides: (recent.data ?? []).map((row) => rideFromRequest(row)),
      count: totals.count ?? 0,
      signedIn: Boolean(auth.data.user),
    };
  } catch {
    return { rides: [], count: 0, signedIn: false };
  }
}

type HomeSearchParams = Promise<{ code?: string | string[] }>;

export default async function HomePage({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams;
  const rawCode = params.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);

  const { rides, count, signedIn } = await loadHomeRides();
  const heroRides = [rides[0] ?? FALLBACK_RIDES[0], rides[1] ?? FALLBACK_RIDES[1]];
  const recentRides = rides.length ? rides : FALLBACK_RIDES;

  return (
    <HomeAuthProvider>
      <main className="home">
        <div className="home-wrap">
          <header className="home-header">
            <Link className="home-brand" href="/">
              <Image src="/Ritjes_logo.jpeg" alt="Ritjes.com" width={260} height={170} priority />
            </Link>
            <nav className="home-nav" aria-label="Hoofdnavigatie">
              <Link href="/rides">Bekijk ritjes</Link>
              <a href="#hoe-het-werkt">Hoe het werkt</a>
              <HomeAuthButton mode="login" className="home-nav-login">Inloggen</HomeAuthButton>
              <HomeAuthButton mode="register" className="home-nav-register">Account aanmaken</HomeAuthButton>
            </nav>
          </header>

          <section className="home-hero">
            <div>
              <span className="home-eyebrow">Lokaal vervoer, zonder gedoe</span>
              <h1>
                Iets te vervoeren?<br />
                <em>Iemand rijdt al jouw kant op.</em>
              </h1>
              <p className="home-lead">
                Plaats wat je wilt laten meenemen, of help iemand anders onderweg. Spullen of personen: je spreekt zelf de prijs en de details af.
              </p>
              <div className="home-hero-actions">
                <Link className="home-btn home-btn-primary" href="/rides">Bekijk alle ritjes</Link>
                <Link className="home-btn home-btn-ghost" href="/requests/new">Plaats een verzoek</Link>
              </div>
              <div className="home-trust">
                <span>Gratis bekijken</span>
                <span>Zonder account</span>
                <span>Lokaal en persoonlijk</span>
              </div>
            </div>

            <div className="home-hero-visual">
              <div className="home-glow" aria-hidden="true" />
              {heroRides.map((ride) => (
                <div className="home-ride-preview" key={ride.id}>
                  <div className="home-ride-top">
                    <div className="home-ride-icon" aria-hidden="true">{ride.icon}</div>
                    <div>
                      <strong>{ride.title}</strong>
                      <p className="home-meta">{ride.origin} → {ride.destination}</p>
                    </div>
                    <span className={ride.status === "claimed" ? "home-pill home-pill-green" : "home-pill"}>{statusLabel(ride.status)}</span>
                  </div>
                  {ride.reward != null && <p className="home-price">{formatReward(ride.reward)}</p>}
                </div>
              ))}
              <div className="home-count-card">
                <span>{count > 0 ? "Op dit moment" : "Binnenkort"}</span>
                <strong>{count > 0 ? `${count} ${count === 1 ? "ritje" : "ritjes"}` : "Nieuwe ritjes"}</strong>
              </div>
            </div>
          </section>

          <section className="home-band" id="hoe-het-werkt">
            <div className="home-section-head">
              <div>
                <h2>Zo werkt het</h2>
                <p>In drie stappen van verzoek naar rit.</p>
              </div>
            </div>
            <div className="home-steps">
              <div className="home-step">
                <div className="home-step-num">1</div>
                <h3>Plaats je verzoek</h3>
                <p>Vertel wat er mee moet, waar het vandaan komt en wat je ervoor over hebt.</p>
              </div>
              <div className="home-step">
                <div className="home-step-num">2</div>
                <h3>Krijg een reactie</h3>
                <p>Iemand accepteert, of doet een tegenvoorstel. Jij beslist.</p>
              </div>
              <div className="home-step">
                <div className="home-step-num">3</div>
                <h3>Spreek het af</h3>
                <p>Na acceptatie zien jullie elkaars gegevens en maken jullie de rit concreet.</p>
              </div>
            </div>
          </section>

          <section className="home-band home-band-tight">
            <div className="home-section-head">
              <div>
                <h2>Recent geplaatst</h2>
                <p>Een indruk van wat er langskomt.</p>
              </div>
              <Link className="home-btn home-btn-ghost home-btn-small" href="/rides">Alles bekijken</Link>
            </div>
            <div className="home-recent">
              {recentRides.map((ride) => {
                const content = (
                  <>
                    <div className="home-recent-icon" aria-hidden="true">{ride.icon}</div>
                    <h3>{ride.title}</h3>
                    <p>{ride.origin} → {ride.destination}</p>
                    <span className="home-tag">{ride.type === "personen" ? "Personen" : "Spullen"}</span>
                  </>
                );
                return ride.id.startsWith("voorbeeld-") ? (
                  <article className="home-tile" key={ride.id}>{content}</article>
                ) : (
                  <Link className="home-tile" key={ride.id} href={`/rides/${ride.id}`}>{content}</Link>
                );
              })}
            </div>
          </section>

          <section className="home-band home-band-tight">
            <div className="home-cta">
              <div>
                <h2>Iets te vervoeren of een ritje over?</h2>
                <p>Plaats het in een minuut. Bekijken kan altijd zonder account.</p>
              </div>
              {signedIn ? (
                <Link className="home-btn home-btn-light" href="/requests/new">Plaats een verzoek</Link>
              ) : (
                <HomeAuthButton mode="register" className="home-btn home-btn-light">Begin nu</HomeAuthButton>
              )}
            </div>
          </section>

          <footer className="home-footer">
            <span>© 2026 Ritjes.com</span>
            <span>
              <Link href="/voorwaarden">Gebruiksvoorwaarden</Link> · <Link href="/privacyverklaring">Privacyverklaring</Link> ·{" "}
              <a href="mailto:welkom@ritjes.com">Contact</a>
            </span>
          </footer>
        </div>
      </main>
    </HomeAuthProvider>
  );
}
