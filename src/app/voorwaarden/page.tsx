import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Gebruiksvoorwaarden · Ritjes.com" };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link href="/">← Terug naar Ritjes.com</Link>
      <h1>Gebruiksvoorwaarden</h1>
      <p>Versie 1.0 · 19 november 2026</p>

      <h2>1. Over Ritjes.com</h2>
      <p>Ritjes.com is een platform waarop gebruikers vervoer-verzoeken kunnen plaatsen en daarop kunnen reageren. Ritjes.com brengt gebruikers met elkaar in contact en voert zelf geen vervoer uit.</p>
      <p>Beheerder: Ritjes.com, Julianalaan 18, 3626 AM Nieuwer Ter Aa. Contact: <a href="mailto:welkom@ritjes.com">welkom@ritjes.com</a>.</p>

      <h2>2. Account</h2>
      <p>Je gebruikt een geldig e-mailadres dat je bevestigt en een voornaam of weergavenaam. Houd je inloggegevens vertrouwelijk en houd je accountgegevens actueel. Je bent verantwoordelijk voor activiteiten via je account.</p>

      <h2>3. Verzoeken en gedrag</h2>
      <p>Je bent verantwoordelijk voor de juistheid en volledigheid van je verzoek en voor de afspraken die je met andere gebruikers maakt. Plaats geen illegale of gevaarlijke vervoerverzoeken en deel geen gegevens die je niet openbaar wilt maken. Verzoeken en de ingevulde gegevens kunnen zichtbaar zijn voor bezoekers van de website.</p>
      <p>Je mag het platform niet misbruiken, anderen lastigvallen of informatie plaatsen waarvoor je geen rechten hebt. Voor een foto die je uploadt, moet je toestemming hebben om die te delen. Je geeft Ritjes.com toestemming de foto te tonen voor het uitvoeren van de dienst.</p>

      <h2>4. Afspraken tussen gebruikers</h2>
      <p>De gebruiker die een verzoek plaatst en de gebruiker die het accepteert maken zelf afspraken over uitvoering, tijd, vergoeding en eventuele betaling. Ritjes.com houdt geen betalingen aan en is geen partij bij die afspraken. Controleer zelf of een afspraak veilig en wettelijk is.</p>

      <h2>5. Beschikbaarheid en aansprakelijkheid</h2>
      <p>We proberen het platform beschikbaar en actueel te houden, maar garanderen niet dat een verzoek wordt geaccepteerd of uitgevoerd. Voor zover wettelijk toegestaan is Ritjes.com niet aansprakelijk voor afspraken of vervoer tussen gebruikers, of voor tijdelijke onbeschikbaarheid of onjuiste gebruikersinformatie. Deze voorwaarden beperken geen aansprakelijkheid die wettelijk niet mag worden uitgesloten.</p>

      <h2>6. Maatregelen en wijzigingen</h2>
      <p>We mogen content verwijderen of een account beperken wanneer dat nodig is om de dienst veilig te houden of deze voorwaarden te handhaven. We kunnen deze voorwaarden aanpassen; bij belangrijke wijzigingen informeren we gebruikers via de website of e-mail. De geldende versie staat op deze pagina.</p>

      <h2>7. Contact en recht</h2>
      <p>Vragen of klachten kun je sturen naar <a href="mailto:welkom@ritjes.com">welkom@ritjes.com</a>. Op deze voorwaarden is Nederlands recht van toepassing, met behoud van dwingende wettelijke rechten.</p>

      <p><Link href="/privacyverklaring">Lees ook de privacyverklaring</Link>.</p>
    </main>
  );
}
