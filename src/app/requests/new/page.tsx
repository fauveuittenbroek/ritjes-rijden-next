import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "@/components/request-form";

export const metadata: Metadata = { title: "Nieuw verzoek · Ritjes Rijden" };

export default function NewRequestPage() {
  return (
    <main>
      <Link href="/rides">← Terug naar alle ritjes</Link>
      <h1>Nieuw verzoek</h1>
      <RequestForm />
    </main>
  );
}
