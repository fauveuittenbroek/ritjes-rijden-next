"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompleteRideButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function complete() {
    if (busy) return;
    if (!window.confirm("Weet je zeker dat deze rit is afgerond? Daarna kunnen jullie elkaar beoordelen.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/requests/${requestId}/complete`, { method: "POST" });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Afronden is niet gelukt. Probeer het opnieuw.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="button-primary" onClick={complete} disabled={busy}>
        {busy ? "Bezig…" : "Markeer als afgerond"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
