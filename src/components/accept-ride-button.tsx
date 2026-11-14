"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AcceptRideButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [client] = useState(() => createClient());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await client.rpc("claim_request", { _id: requestId });
      if (rpcError) throw rpcError;
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
