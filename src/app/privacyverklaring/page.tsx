import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Privacyverklaring · Ritjes.com" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <Link href="/">← Terug naar Ritjes.com</Link>
      <h1>Privacyverklaring</h1>
      <p>Versie 1.0 · 19 november 2026</p>

      <h2>1. Wie is verantwoordelijk?</h2>
      <p>Ritjes.com, Julianalaan 18, 3626 AM Nieuwer Ter Aa, is verantwoordelijk voor de verwerking van persoonsgegevens via deze website. Contact: <a href="mailto:welkom@ritjes.com">welkom@ritjes.com</a>.</p>

      <h2>2. Welke gegevens verwerken we?</h2>
      <ul>
        <li>Je e-mailadres voor accountbevestiging, inloggen en noodzakelijke berichten.</li>
        <li>Je voornaam of weergavenaam voor je profiel en de verzoeken die je plaatst.</li>
        <li>Gegevens die je in een verzoek invult, zoals vertrek, bestemming, exact ophaaladres, exact afleveradres, instructies, datum/tijd, vergoeding, aantal personen en foto.</li>
        <li>Tegenvoorstellen die je doet of ontvangt, zoals het voorgestelde bedrag, je korte bericht en de status daarvan.</li>
        <li>Gebeurtenissen rond accepteren, vrijgeven en wijzigen van verzoeken, voor de werking en controle van de dienst.</li>
        <li>Technische gegevens die nodig zijn om de website veilig en werkend te houden.</li>
      </ul>

      <h2>3. Waarom en op welke grond verwerken we die?</h2>
      <p>We verwerken accountgegevens en verzoekinformatie om Ritjes.com te leveren, verzoeken te tonen en gebruikers met elkaar in contact te brengen. De grondslag is uitvoering van de dienst die je aanvraagt. We verwerken noodzakelijke beveiligings- en gebeurtenisgegevens voor het veilig beheren van de dienst en het behandelen van misbruik. Je aanvaarding van de gebruiksvoorwaarden en bevestiging dat je de privacyverklaring hebt gelezen, worden met versienummer en tijdstip geregistreerd.</p>

      <h2>4. Wat is zichtbaar voor anderen?</h2>
      <p>Verzoeken zijn openbaar zichtbaar. De ingevulde weergavenaam, route, overige informatie en foto in het verzoek kunnen daarom door bezoekers worden gezien. Exacte ophaal- en afleveradressen worden alleen getoond aan de plaatser en de ingelogde rijder die het verzoek heeft geaccepteerd. Vul geen gevoelige informatie in die anderen niet mogen zien. Je e-mailadres wordt niet op de openbare pagina getoond. Wanneer iemand je verzoek accepteert, sturen we je diens naam en e-mailadres zodat jullie de rit kunnen afstemmen.</p>

      <h2>5. Dienstverleners en kaarten</h2>
      <p>We gebruiken Supabase voor accounts, database en foto-opslag, Netlify voor het hosten van de website en Resend voor noodzakelijke e-mails. Voor plaats- en routeweergave gebruiken we OpenStreetMap, Nominatim en OSRM. Deze diensten ontvangen de gegevens die nodig zijn voor hun taak, zoals plaatsnamen, routecoördinaten of technische verbindingsgegevens. Hun eigen privacyvoorwaarden zijn ook van toepassing op gegevens die zij verwerken.</p>

      <h2>6. Bewaartermijn</h2>
      <p>We bewaren accountgegevens zolang je account actief is en verzoekgegevens zolang ze nodig zijn voor de dienst, de afhandeling van verzoeken en beveiliging. Je kunt verwijdering van je account en persoonsgegevens aanvragen via <a href="mailto:welkom@ritjes.com">welkom@ritjes.com</a>. We verwijderen gegevens wanneer dat kan, behalve wanneer we ze wettelijk moeten bewaren of nodig hebben voor een lopende juridische kwestie.</p>

      <h2>7. Je rechten</h2>
      <p>Je kunt vragen om inzage, correctie of verwijdering van je persoonsgegevens, en in toepasselijke gevallen om beperking, bezwaar of overdracht. Stuur je verzoek naar <a href="mailto:welkom@ritjes.com">welkom@ritjes.com</a>. Je kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.</p>

      <h2>8. Cookies en beveiliging</h2>
      <p>De website gebruikt noodzakelijke sessiecookies om je veilig ingelogd te houden. We gebruiken geen advertentie- of marketingcookies. We nemen passende maatregelen om persoonsgegevens te beveiligen, maar geen enkele internetdienst kan absolute veiligheid garanderen.</p>

      <h2>9. Wijzigingen en contact</h2>
      <p>Bij belangrijke wijzigingen van deze verklaring informeren we gebruikers via de website of e-mail. Vragen over privacy kun je sturen naar <a href="mailto:welkom@ritjes.com">welkom@ritjes.com</a>.</p>

      <p><Link href="/voorwaarden">Lees ook de gebruiksvoorwaarden</Link>.</p>
      </main>
    </>
  );
}
