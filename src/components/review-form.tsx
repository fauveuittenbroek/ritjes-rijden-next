"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stars } from "@/components/stars";

export function ReviewForm({
  requestId,
  initialRating = 0,
  initialComment = "",
  existing = false,
}: {
  requestId: string;
  initialRating?: number;
  initialComment?: string;
  existing?: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (rating < 1) {
      setError("Kies eerst een aantal sterren.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/requests/${requestId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      if (!response.ok) throw new Error();
      setMessage(existing ? "Je beoordeling is bijgewerkt." : "Bedankt voor je beoordeling.");
      router.refresh();
    } catch {
      setError("Je beoordeling versturen is niet gelukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <h3>{existing ? "Jouw beoordeling aanpassen" : "Beoordeel deze rit"}</h3>
      <Stars value={rating} onChange={setRating} size={28} />
      <label htmlFor={`review-comment-${requestId}`}>Toelichting (optioneel)</label>
      <textarea
        id={`review-comment-${requestId}`}
        rows={3}
        maxLength={1000}
        placeholder="Hoe verliep de rit?"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      {message && <p className="review-message" role="status">{message}</p>}
      <button type="submit" className="button-primary" disabled={busy}>
        {busy ? "Bezig…" : existing ? "Beoordeling bijwerken" : "Beoordeling plaatsen"}
      </button>
    </form>
  );
}
