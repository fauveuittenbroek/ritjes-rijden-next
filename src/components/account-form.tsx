"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountForm() {
  const [client] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setMessage("Wachtwoord opslaan is niet gelukt. Kies een wachtwoord van minimaal 8 tekens.");
        return;
      }
      setPassword("");
      setMessage("Wachtwoord opgeslagen. Je kunt nu direct inloggen met je e-mailadres en wachtwoord.");
    } catch {
      setMessage("Wachtwoord opslaan is niet gelukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="account-password">Nieuw wachtwoord</label>
      <input
        id="account-password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit" disabled={busy}>
        {busy ? "Opslaan..." : "Wachtwoord opslaan"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
