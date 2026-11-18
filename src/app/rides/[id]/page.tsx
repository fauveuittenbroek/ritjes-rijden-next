import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapPoint, Ride } from "@/lib/rides";
import { loadRide, publicPhotoUrl } from "@/lib/rides-server";
import { geocodePlace } from "@/lib/geocode";
import { distanceBetween } from "@/lib/distance";
import { AcceptRideButton } from "@/components/accept-ride-button";
import { ReleaseRideButton } from "@/components/release-ride-button";
import { LiveMapLoader } from "@/components/live-map-loader";
import { RideThumb } from "@/components/ride-thumb";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { ride } = await loadRide(id);
  if (!ride) return { title: "Ritje niet gevonden · Ritjes Rijden" };
  const title = `${ride.title} · ${ride.origin} → ${ride.destination}`;
  const image = ride.photoPath
    ? publicPhotoUrl(ride.photoPath)
    : ride.image?.startsWith("/")
      ? ride.image
      : undefined;
  return {
    title,
    description: ride.description ?? `${ride.title} van ${ride.origin} naar ${ride.destination}.`,
    openGraph: {
      title,
      description: ride.description ?? undefined,
      type: "website",
      images: image ? [{ url: image, alt: ride.title }] : undefined,
    },
  };
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReward(reward: number | null): string {
  return reward == null ? "Nog niet opgegeven." : `€ ${reward.toFixed(2).replace(".", ",")}`;
}

async function mapPointsForRide(ride: Ride): Promise<MapPoint[]> {
  const [originPoint, destinationPoint] = await Promise.all([
    ride.originPoint ?? geocodePlace(ride.origin),
    ride.destinationPoint ?? geocodePlace(ride.destination),
  ]);
  const points: MapPoint[] = [];
  if (originPoint) points.push({ role: "origin", label: `Vertrek: ${ride.origin}`, position: originPoint });
  if (destinationPoint) points.push({ role: "destination", label: `Bestemming: ${ride.destination}`, position: destinationPoint });
  return points;
}

async function RideMapSection({ ride }: { ride: Ride }) {
  const mapPoints = await mapPointsForRide(ride);
  const distance = mapPoints.length === 2 ? await distanceBetween(mapPoints[0].position, mapPoints[1].position) : null;
  return (
    <section className="ride-map">
      <h2>Rit live volgen</h2>
      {distance && (
        <p className="ride-distance">
          Afstand: ca. {Math.round(distance.km)} km{distance.mode === "straight" ? " (hemelsbreed)" : " over de weg"}
        </p>
      )}
      {mapPoints.length ? (
        <LiveMapLoader points={mapPoints} />
      ) : (
        <p>De locatie van dit ritje kon niet worden bepaald.</p>
      )}
    </section>
  );
}

export default async function RidePage({ params }: { params: Params }) {
  const { id } = await params;
  const { ride, isAuthed } = await loadRide(id);
  if (!ride) notFound();

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const shareText = `Wil iemand ${ride.title} meenemen van ${ride.origin} naar ${ride.destination}? Bekijk op ritjes: ${protocol}://${host}/rides/${ride.id}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <main className="ride-detail">
      <Link href="/rides">← Terug naar alle ritjes</Link>
      <article>
        <RideThumb icon={ride.icon} image={ride.image} title={ride.title} large priority />
        <h1>{ride.title}</h1>
        <p className="ride-route">
          {ride.origin} → {ride.destination}
        </p>
        <p>
          <strong>Status:</strong> {ride.status === "open" ? "Open" : "Geaccepteerd"}
        </p>

        <div className="ride-actions">
          <a className="whatsapp-share" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            Deel via WhatsApp
          </a>
          {!isAuthed && (
            <Link className="button-primary" href="/login">
              Inloggen
            </Link>
          )}
        </div>

        <dl>
          {ride.numPeople != null && (
            <>
              <dt>Aantal personen</dt>
              <dd>{ride.numPeople}</dd>
            </>
          )}
          {ride.type === "personen" && (
            <>
              <dt>Datum en tijd</dt>
              <dd>{formatDateTime(ride.scheduledAt) ?? "Nog niet opgegeven."}</dd>
            </>
          )}
          <dt>Omschrijving</dt>
          <dd>{ride.description || "Nog niet opgegeven."}</dd>
          {ride.contactName && (
            <>
              <dt>Door</dt>
              <dd>{ride.contactName}</dd>
            </>
          )}
          <dt>Ophaaladres</dt>
          <dd>{ride.pickupAddress || "Nog niet opgegeven."}</dd>
          <dt>Vergoeding</dt>
          <dd>{formatReward(ride.reward)}</dd>
          {ride.type === "goederen" && (
            <>
              <dt>Deadline</dt>
              <dd>{formatDate(ride.deadline) ?? "Nog niet opgegeven."}</dd>
            </>
          )}
        </dl>

        <Suspense
          fallback={
            <section className="ride-map">
              <h2>Rit live volgen</h2>
              <p>Kaart laden…</p>
            </section>
          }
        >
          <RideMapSection ride={ride} />
        </Suspense>

        <div className="ride-accept">
          {!isAuthed ? (
            <>
              <p>Log in om dit ritje te accepteren.</p>
              <Link className="rides-add" href="/login">
                Inloggen
              </Link>
            </>
          ) : ride.status !== "open" ? (
            ride.isClaimer || ride.isCreator ? (
              <>
                <p>{ride.isClaimer ? "Je hebt dit ritje geaccepteerd." : "Dit ritje is geaccepteerd."}</p>
                <ReleaseRideButton requestId={ride.id} />
              </>
            ) : (
              <p>Dit ritje is geaccepteerd.</p>
            )
          ) : ride.isCreator ? (
            <p>Dit is je eigen verzoek; je kunt het niet zelf accepteren.</p>
          ) : (
            <AcceptRideButton requestId={ride.id} />
          )}
        </div>
      </article>
    </main>
  );
}
