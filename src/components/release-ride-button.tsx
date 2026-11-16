"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ReleaseRideButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [client] = useState(() => createClient());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function release() {
    setBusy(true);
    setError("");
    const { error: rpcError } = await client.rpc("release_request", { _id: requestId });
    if (rpcError) {
      setError("Vrijgeven is niet gelukt. Probeer het opnieuw.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button onClick={release} disabled={busy}>
        {busy ? "Bezig…" : "Geef vrij"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
