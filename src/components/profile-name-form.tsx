"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfileNameForm({ userId, initialName }: { userId: string; initialName: string }) {
  const [client] = useState(() => createClient());
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = name.trim();
    if (busy || !displayName) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.from("profiles").upsert(
        { id: userId, display_name: displayName },
        { onConflict: "id" },
      );
      setMessage(error ? "Weergavenaam opslaan is mislukt." : "Weergavenaam opgeslagen.");
    } catch {
      setMessage("Weergavenaam opslaan is mislukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="profile-display-name">Voornaam of weergavenaam</label>
      <input
        id="profile-display-name"
        type="text"
        autoComplete="name"
        maxLength={80}
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" disabled={busy}>{busy ? "Opslaan..." : "Naam opslaan"}</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
