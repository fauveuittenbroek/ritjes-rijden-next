import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapPoint, Ride } from "@/lib/rides";
import { createClient } from "@/lib/supabase/server";
import { loadRide, publicPhotoUrl } from "@/lib/rides-server";
import { loadRideOffers } from "@/lib/request-offers";
import { CounterOfferForm } from "@/components/counter-offer-form";
import { OfferCard } from "@/components/offer-card";
import { geocodePlace } from "@/lib/geocode";
import { distanceBetween } from "@/lib/distance";
import { requireSiteAccess } from "@/lib/access";
import { AcceptRideButton } from "@/components/accept-ride-button";
import { CompleteRideButton } from "@/components/complete-ride-button";
import { DeleteRideButton } from "@/components/delete-ride-button";
import { ReviewForm } from "@/components/review-form";
import { Stars } from "@/components/stars";
import { loadRideCompletion, loadRideReviews } from "@/lib/reviews";
import { ReleaseRideButton } from "@/components/release-ride-button";
import { LiveMapLoader } from "@/components/live-map-loader";
import { RideThumb } from "@/components/ride-thumb";
import { SiteHeader } from "@/components/site-header";

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
  await requireSiteAccess(`/rides/${id}`);
  const { ride, isAuthed } = await loadRide(id);
  if (!ride) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const offers = ride.status === "open" ? await loadRideOffers(ride.id) : [];
  const completion = ride.status === "claimed" ? await loadRideCompletion(ride.id) : null;
  const reviews = ride.status === "claimed" ? await loadRideReviews(ride.id) : [];
  const myReview = user ? reviews.find((review) => review.reviewerId === user.id) : undefined;

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const shareText = `Wil iemand ${ride.title} meenemen van ${ride.origin} naar ${ride.destination}? Bekijk op ritjes: ${protocol}://${host}/rides/${ride.id}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const statusText = ride.status === "open" ? "Open" : completion ? "Afgerond" : "Geaccepteerd";
  const statusClass = ride.status === "open" ? "is-open" : completion ? "is-completed" : "is-claimed";
  const typeLabel = ride.type === "goederen" ? "Spullen" : "Personen";

  return (
    <>
      <SiteHeader />
      <main className="ride-detail">
        <Link href="/rides" className="detail-back">← Alle ritjes</Link>
        <article>
          <header className="detail-hero">
            <RideThumb icon={ride.icon} image={ride.image} title={ride.title} large priority />
            <div className="detail-hero-body">
              <div className="detail-badges">
                <span className={`detail-status ${statusClass}`}>{statusText}</span>
                <span className="detail-type">{typeLabel}</span>
              </div>
              <h1>{ride.title}</h1>
              <p className="detail-route">
                <span>{ride.origin}</span>
                <span aria-hidden="true">→</span>
                <span>{ride.destination}</span>
              </p>
              <div className="detail-chips">
                <span className="detail-chip">
                  <strong>{formatReward(ride.reward)}</strong>
                  <small>vergoeding</small>
                </span>
                {ride.numPeople != null && (
                  <span className="detail-chip">
                    <strong>{ride.numPeople}</strong>
                    <small>personen</small>
                  </span>
                )}
                {ride.type === "personen" && (
                  <span className="detail-chip">
                    <strong>{formatDateTime(ride.scheduledAt) ?? "Nog niet opgegeven"}</strong>
                    <small>datum en tijd</small>
                  </span>
                )}
                {ride.type === "goederen" && (
                  <span className="detail-chip">
                    <strong>{formatDate(ride.deadline) ?? "Geen deadline"}</strong>
                    <small>deadline</small>
                  </span>
                )}
              </div>
              <div className="ride-actions">
                <a className="whatsapp-share" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  Deel via WhatsApp
                </a>
              </div>
            </div>
          </header>

          <div className="detail-layout">
            <div className="detail-main">
              <section className="detail-card">
                <h2>Over deze aanvraag</h2>
                <p className="detail-description">{ride.description || "Er is geen extra omschrijving toegevoegd."}</p>
                <dl className="detail-facts">
                  <div><dt>Vertrek</dt><dd>{ride.origin}</dd></div>
                  <div><dt>Bestemming</dt><dd>{ride.destination}</dd></div>
                  {ride.contactName && <div><dt>Geplaatst door</dt><dd>{ride.contactName}</dd></div>}
                  {ride.type === "personen" && (
                    <div><dt>Datum en tijd</dt><dd>{formatDateTime(ride.scheduledAt) ?? "Nog niet opgegeven."}</dd></div>
                  )}
                  {ride.type === "goederen" && (
                    <div><dt>Deadline</dt><dd>{formatDate(ride.deadline) ?? "Nog niet opgegeven."}</dd></div>
                  )}
                </dl>
              </section>

              <section className="detail-card">
                <h2>Exacte adressen</h2>
                {ride.isCreator || ride.isClaimer ? (
                  <dl className="detail-facts">
                    <div><dt>Ophalen</dt><dd>{ride.pickupAddress || "Nog niet opgegeven."}</dd></div>
                    <div><dt>Afleveren</dt><dd>{ride.deliveryAddress || "Nog niet opgegeven."}</dd></div>
                  </dl>
                ) : (
                  <p className="detail-note">Deze adressen zijn alleen zichtbaar voor de plaatser en de geaccepteerde rijder.</p>
                )}
              </section>

              <Suspense
                fallback={
                  <section className="detail-card ride-map">
                    <h2>Rit live volgen</h2>
                    <p>Kaart laden…</p>
                  </section>
                }
              >
                <RideMapSection ride={ride} />
              </Suspense>
            </div>

            <aside className="detail-side">
              <section className="detail-card detail-action-card">
                <span className="detail-price-label">Vergoeding</span>
                <strong className="detail-price">{formatReward(ride.reward)}</strong>
                <div className="ride-accept">
                  {!isAuthed ? (
                    <>
                      <p>{ride.status === "open" ? "Log in om dit ritje te accepteren." : "Log in om de gegevens van dit ritje te bekijken."}</p>
                      <Link className="button-primary" href="/login">
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
                    <>
                      <p>Dit is je eigen verzoek; je kunt het niet zelf accepteren.</p>
                      <div className="ride-owner-actions">
                        <Link className="button-secondary" href={`/requests/${ride.id}/edit`}>
                          Bewerk
                        </Link>
                        <DeleteRideButton requestId={ride.id} photoPath={ride.photoPath ?? null} />
                      </div>
                    </>
                  ) : (
                    <>
                      <AcceptRideButton requestId={ride.id} />
                      <CounterOfferForm requestId={ride.id} requestedReward={ride.reward} />
                    </>
                  )}
                </div>
              </section>

              {offers.length > 0 && (
                <section className="detail-card ride-offers" aria-live="polite">
                  <h2>{ride.isCreator ? "Tegenvoorstellen" : "Jouw tegenvoorstel"}</h2>
                  {(ride.isCreator ? offers : offers.filter((offer) => offer.offeredBy === user?.id)).map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      canRespond={Boolean(ride.isCreator && offer.status === "proposed")}
                      canWithdraw={Boolean(offer.offeredBy === user?.id && offer.status === "proposed")}
                      offererLabel={offer.offererName ?? "Rijder"}
                    />
                  ))}
                </section>
              )}
            </aside>
          </div>

          {ride.status === "claimed" && (
            <section className="detail-card ride-reviews">
              <h2>Beoordelingen</h2>
              {completion ? (
                <p className="ride-completed">
                  Afgerond op {formatDate(completion.completedAt) ?? "onbekende datum"}.
                </p>
              ) : (
                <p className="detail-note">
                  Deze rit is nog niet afgerond. Na afronding kunnen de plaatser en de rijder elkaar beoordelen.
                </p>
              )}

              {isAuthed && (ride.isCreator || ride.isClaimer) && !completion && (
                <CompleteRideButton requestId={ride.id} />
              )}

              {isAuthed && (ride.isCreator || ride.isClaimer) && completion && (
                <ReviewForm
                  requestId={ride.id}
                  initialRating={myReview?.rating ?? 0}
                  initialComment={myReview?.comment ?? ""}
                  existing={Boolean(myReview)}
                />
              )}

              {reviews.length ? (
                <ul className="review-list">
                  {reviews.map((review) => (
                    <li key={review.id} className="review-card">
                      <header>
                        <strong>{review.reviewerName}</strong>
                        <Stars value={review.rating} size={16} />
                        <span>{formatDate(review.createdAt)}</span>
                      </header>
                      {review.comment && <p>{review.comment}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="detail-note">Er zijn nog geen beoordelingen geplaatst.</p>
              )}
            </section>
          )}
        </article>
      </main>
    </>
  );
}
