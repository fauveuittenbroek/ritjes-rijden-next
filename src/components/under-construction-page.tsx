import Image from "next/image";
import Link from "next/link";
import { HomeAuthButton, HomeAuthProvider } from "@/components/home-auth";
import { WaitlistForm } from "@/components/waitlist-form";

export function UnderConstructionPage() {
  return (
    <HomeAuthProvider allowRegistration={false}>
      <main className="construction-page">
        <div className="construction-wrap">
          <header className="construction-header">
            <Link href="/" aria-label="Ritjes.com homepage">
              <Image src="/Ritjes_logo.jpeg" alt="Ritjes.com" width={360} height={240} priority className="construction-logo" />
            </Link>
            <div className="construction-login">
              <span>Heb je al een account?</span>
              <HomeAuthButton mode="login" className="site-auth-ghost">Inloggen</HomeAuthButton>
            </div>
          </header>

          <section className="construction-hero">
            <div className="construction-copy">
              <span className="construction-eyebrow"><span className="construction-dot" /> Binnenkort beschikbaar</span>
              <h1>We maken Ritjes.com klaar voor de start.</h1>
              <p className="construction-lead">
                Straks vind je hier eenvoudig iemand die jouw spullen of jou kan meenemen. We leggen de laatste hand aan de site.
              </p>
              <p className="construction-prompt">Wil je op de hoogte blijven van de ontwikkelingen?</p>
              <WaitlistForm />
            </div>

            <div className="construction-visual" aria-hidden="true">
              <div className="construction-orbit construction-orbit-one" />
              <div className="construction-orbit construction-orbit-two" />
              <div className="construction-route-card">
                <div className="construction-route-status"><span className="construction-dot" /> Ritjes.com komt eraan</div>
                <div className="construction-route-line">
                  <span className="route-stop" />
                  <span className="route-stroke" />
                  <span className="route-stop route-stop-end" />
                </div>
                <div className="construction-route-labels"><strong>Jouw vertrek</strong><strong>Jouw bestemming</strong></div>
                <div className="construction-route-footer">Spullen of personen · dichtbij of verder weg</div>
              </div>
              <div className="construction-floating construction-floating-one">Lokaal en persoonlijk</div>
              <div className="construction-floating construction-floating-two">Een ritje kan al genoeg zijn</div>
            </div>
          </section>

          <footer className="construction-footer">
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
