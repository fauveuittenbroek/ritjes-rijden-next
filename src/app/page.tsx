import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Ritjes Rijden</h1>
      <p>Deel en ontdek ritjes.</p>
      <nav aria-label="Hoofdnavigatie" className="home-actions">
        <Link href="/login" className="button-secondary">
          Inloggen
        </Link>
        <Link href="/rides" className="button-primary">
          Bekijk ritjes
        </Link>
      </nav>
    </main>
  );
}
