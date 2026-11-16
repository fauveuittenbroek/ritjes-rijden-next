"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptRideButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/requests/${requestId}/claim`, { method: "POST" });
      if (!response.ok) throw new Error("claim failed");
      router.refresh();
    } catch {
      setError("Accepteren is niet gelukt. Het verzoek is misschien al geaccepteerd, of het is je eigen verzoek.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={accept} disabled={busy}>
        {busy ? "Bezig…" : "Accepteer ritje"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
