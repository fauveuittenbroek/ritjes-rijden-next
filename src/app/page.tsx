import type { Metadata } from "next";
import { FullHomePage } from "@/components/full-home-page";
import { UnderConstructionPage } from "@/components/under-construction-page";
import { getSiteAccess } from "@/lib/access";

export async function generateMetadata(): Promise<Metadata> {
  const access = await getSiteAccess();
  return access.constructionMode
    ? {
        title: "Binnenkort beschikbaar · Ritjes.com",
        description: "Ritjes.com wordt klaargemaakt. Laat je e-mailadres achter en we houden je op de hoogte.",
      }
    : {
        title: "Ritjes.com · Iets te vervoeren? Iemand rijdt al jouw kant op.",
        description:
          "Plaats een vervoersverzoek voor spullen of personen, of help iemand onderweg. Bekijk ritjes gratis en zonder account.",
      };
}

export default async function HomePage() {
  const access = await getSiteAccess();
  return access.constructionMode ? <UnderConstructionPage /> : <FullHomePage />;
}
