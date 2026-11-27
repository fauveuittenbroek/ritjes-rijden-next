"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function WaitlistForm() {
  const [client] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!consent) {
      setError("Geef toestemming om updates over Ritjes.com te ontvangen.");
      return;
    }
    if (honeypot.trim()) {
      setMessage("Bedankt! Je staat op de lijst.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: insertError } = await client
        .from("launch_waitlist")
        .insert({ email: email.trim().toLowerCase(), consented: true });
      if (insertError && insertError.code !== "23505") {
        setError("Aanmelden is niet gelukt. Probeer het later opnieuw.");
        return;
      }
      setMessage(insertError ? "Je staat al op de lijst. Bedankt!" : "Gelukt! We laten je per e-mail weten wanneer Ritjes.com klaar is.");
      setEmail("");
      setConsent(false);
    } catch {
      setError("Aanmelden is niet gelukt. Probeer het later opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="waitlist-form" onSubmit={submit}>
      <label htmlFor="waitlist-email">E-mailadres</label>
      <div className="waitlist-input-row">
        <input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          placeholder="jij@voorbeeld.nl"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Bezig…" : "Houd mij op de hoogte"}
        </button>
      </div>
      <div className="waitlist-honeypot" aria-hidden="true">
        <label htmlFor="waitlist-website">Website</label>
        <input
          id="waitlist-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
      <label className="waitlist-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>
          Ik geef toestemming om per e-mail updates over de lancering van Ritjes.com te ontvangen. Je kunt je altijd uitschrijven. Zie de{" "}
          <a href="/privacyverklaring">privacyverklaring</a>.
        </span>
      </label>
      {error && <p className="waitlist-error" role="alert">{error}</p>}
      {message && <p className="waitlist-success" role="status">{message}</p>}
    </form>
  );
}
