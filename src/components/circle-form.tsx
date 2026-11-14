"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFeatureAuth } from "@/components/feature-auth";

export function CircleForm({ mode }: { mode: "new" | "join" }) {
  const { client, userId, loading, error: authError } = useFeatureAuth();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || busy || !value.trim()) return;
    setBusy(true); setError("");
    try {
      const { error } = mode === "new"
        ? await client.rpc("create_circle", { _name: value.trim() })
        : await client.rpc("join_circle_by_code", { _code: value.trim() });
      if (error) throw error;
      router.replace("/feed");
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      const message = (error as { message?: string } | null)?.message ?? "";
      if (code === "PGRST202" || message.includes("Could not find the function")) {
        setError("De database is nog niet ingericht. Pas eerst de migraties toe in Supabase (map supabase/migrations).");
      } else if (code === "42501" || message.includes("Authentication required")) {
        setError("Je moet ingelogd zijn om dit te doen.");
      } else {
        setError(mode === "new" ? "De groep aanmaken is mislukt. Probeer het opnieuw." : "Deelnemen is mislukt. Controleer de code en probeer opnieuw.");
      }
      setBusy(false);
    }
  }
  if (authError) return <main><p role="alert">{authError}</p></main>;
  if (loading || !userId) return <main><p>Laden…</p></main>;
  const isNew = mode === "new";
  return <main className="page"><Link href="/feed">Terug naar overzicht</Link><h1>{isNew ? "Nieuwe groep" : "Deelnemen aan groep"}</h1>
    <form onSubmit={submit} className="form">
      <label>{isNew ? "Groepsnaam" : "Uitnodigingscode"}<input value={value} onChange={e => setValue(e.target.value)} required maxLength={isNew ? 100 : 200} autoComplete="off" /></label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy}>{busy ? "Bezig…" : isNew ? "Groep aanmaken" : "Deelnemen"}</button>
    </form></main>;
}
