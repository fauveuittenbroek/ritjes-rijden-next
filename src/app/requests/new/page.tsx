import type { Metadata } from "next";
import Link from "next/link";
import { requireSiteAccess } from "@/lib/access";
import { RequestForm } from "@/components/request-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Nieuw verzoek · Ritjes.com" };

export default async function NewRequestPage() {
  await requireSiteAccess("/requests/new");

  return (
    <>
      <SiteHeader />
      <main className="request-page">
        <div className="request-head">
          <div>
            <span className="request-eyebrow">Nieuw verzoek</span>
            <h1>Wat wil je laten vervoeren?</h1>
            <p>Plaats je verzoek in een paar stappen. Daarna kunnen anderen reageren of een tegenvoorstel doen.</p>
          </div>
          <Link href="/rides" className="button-secondary">← Alle ritjes</Link>
        </div>

        <div className="request-layout">
          <aside className="request-aside">
            <section className="request-aside-card">
              <h2>Zo werkt het</h2>
              <ol className="request-steps">
                <li>Kies of je spullen of personen wilt vervoeren.</li>
                <li>Vul de route en eventuele exacte adressen in.</li>
                <li>Bepaal je vergoeding en plaats het verzoek.</li>
                <li>Reageer op een acceptatie of tegenvoorstel.</li>
              </ol>
            </section>
            <section className="request-tip">
              <strong>Tip</strong>
              <p>Hoe duidelijker je omschrijving en route, hoe sneller iemand reageert.</p>
            </section>
            <section className="request-tip request-tip-soft">
              <strong>Privacy</strong>
              <p>Je exacte ophaal- en afleveradres is alleen zichtbaar voor jou en de rijder die je verzoek accepteert.</p>
            </section>
          </aside>

          <div className="request-panel">
            <RequestForm />
          </div>
        </div>
      </main>
    </>
  );
}