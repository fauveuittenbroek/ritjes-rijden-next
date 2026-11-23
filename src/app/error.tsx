"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <h1>Er ging iets mis</h1>
      <p>De pagina kon niet worden geladen. Probeer het opnieuw of ga terug naar het overzicht.</p>
      <div className="home-actions">
        <button type="button" className="button-primary" onClick={reset}>Opnieuw proberen</button>
        <Link className="button-secondary" href="/rides">Bekijk alle ritjes</Link>
        <Link className="button-secondary" href="/">Naar de homepage</Link>
      </div>
    </main>
  );
}