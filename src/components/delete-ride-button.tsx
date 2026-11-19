"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteRideButton({ requestId, photoPath }: { requestId: string; photoPath: string | null }) {
  const router = useRouter();
  const [client] = useState(() => createClient());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removeRide() {
    if (busy || !window.confirm("Weet je zeker dat je dit ritje wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    setBusy(true);
    setError("");

    try {
      const { error: deleteError } = await client.rpc("delete_request", { _id: requestId });
      if (deleteError) {
        setError("Verwijderen is niet gelukt. Alleen de maker kan een open ritje verwijderen.");
        setBusy(false);
        return;
      }
      if (photoPath) {
        try {
          await client.storage.from("request-photos").remove([photoPath]);
        } catch {
        }
      }
      router.replace("/feed");
      router.refresh();
    } catch {
      setError("Verwijderen is niet gelukt. Probeer het opnieuw.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="button-danger" onClick={removeRide} disabled={busy}>
        {busy ? "Bezig…" : "Verwijderen"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
