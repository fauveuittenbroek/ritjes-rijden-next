"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEuro } from "@/lib/email";
import type { RideOffer } from "@/lib/request-offers";

export function OfferCard({
  offer,
  canRespond,
  canWithdraw,
  offererLabel,
}: {
  offer: RideOffer;
  canRespond: boolean;
  canWithdraw: boolean;
  offererLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | "withdraw" | "">("");
  const [error, setError] = useState("");
  const placedAt = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(offer.createdAt));

  async function respond(action: "accept" | "decline" | "withdraw") {
    if (busy) return;
    if (action === "accept" && !window.confirm(`Dit tegenvoorstel van ${formatEuro(offer.amount)} accepteren? Het ritje wordt dan direct aan deze persoon gegeven.`)) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/offers/${offer.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Het tegenvoorstel bijwerken is niet gelukt.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Het tegenvoorstel bijwerken is niet gelukt.");
      setBusy("");
    }
  }

  return (
    <article className="offer-card">
      <p>
        <strong>{offererLabel}</strong> stelt <strong>{formatEuro(offer.amount)}</strong> voor · {placedAt}
      </p>
      {offer.message && <p className="offer-message">{offer.message}</p>}
      <p className="offer-status">Status: {offer.status === "proposed" ? "Open" : offer.status === "accepted" ? "Geaccepteerd" : offer.status === "declined" ? "Gewijgerd" : "Ingetrokken"}</p>

      {(canRespond || canWithdraw) && (
        <div className="offer-actions">
          {canRespond && (
            <>
              <button type="button" onClick={() => respond("accept")} disabled={busy !== ""}>
                {busy === "accept" ? "Bezig…" : "Accepteren"}
              </button>
              <button type="button" className="offer-decline" onClick={() => respond("decline")} disabled={busy !== ""}>
                {busy === "decline" ? "Bezig…" : "Weigeren"}
              </button>
            </>
          )}
          {canWithdraw && (
            <button type="button" className="offer-withdraw" onClick={() => respond("withdraw")} disabled={busy !== ""}>
              {busy === "withdraw" ? "Bezig…" : "Trek terug"}
            </button>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
