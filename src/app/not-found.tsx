import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <h1>Deze pagina bestaat niet</h1>
        <p>De link is verouderd of het ritje is verwijderd.</p>
        <div className="home-actions">
          <Link className="button-primary" href="/rides">Bekijk alle ritjes</Link>
          <Link className="button-secondary" href="/">Naar de homepage</Link>
        </div>
      </main>
    </>
  );
}