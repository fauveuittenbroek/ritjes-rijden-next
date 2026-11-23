"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEuro } from "@/lib/email";

export function CounterOfferForm({ requestId, requestedReward }: { requestId: string; requestedReward: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(requestedReward == null ? "" : String(requestedReward.toFixed(2)).replace(".", ","));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedAmount = Number(amount.trim().replace(",", "."));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || normalizedAmount > 10000) {
      setError("Vul een bedrag in tussen € 0,01 en € 10.000,00.");
      return;
    }
    if (message.trim().length > 280) {
      setError("Je bericht mag maximaal 280 tekens zijn.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/requests/${requestId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: normalizedAmount, message: message.trim() || null }),
      });
      if (!response.ok) throw new Error();
      setOpen(false);
      setMessage("");
      router.refresh();
    } catch {
      setError("Je tegenvoorstel versturen is niet gelukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="button-secondary" onClick={() => setOpen(true)}>
        Doe een tegenvoorstel
      </button>
    );
  }

  return (
    <form className="counter-offer-form" onSubmit={submit}>
      <h2>Tegenvoorstel doen</h2>
      <p>
        {requestedReward == null
          ? "De maker heeft nog geen vergoeding opgegeven."
          : `De gevraagde vergoeding is nu ${formatEuro(requestedReward)}.`}
      </p>
      <label htmlFor={`offer-${requestId}`}>Jouw voorstel (€)</label>
      <input
        id={`offer-${requestId}`}
        inputMode="decimal"
        required
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <label htmlFor={`offer-message-${requestId}`}>Bericht (optioneel)</label>
      <textarea
        id={`offer-message-${requestId}`}
        rows={3}
        maxLength={280}
        placeholder="Waarom past dit bedrag bij deze rit?"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <div className="offer-form-actions">
        <button type="submit" disabled={busy}>{busy ? "Bezig…" : "Voorstel versturen"}</button>
        <button type="button" className="text-button" onClick={() => { setOpen(false); setError(""); }}>Annuleren</button>
      </div>
    </form>
  );
}
