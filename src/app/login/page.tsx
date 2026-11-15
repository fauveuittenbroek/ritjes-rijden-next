"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, networkErrorMessage } from "@/lib/auth-errors";

type Step = "choice" | "existing" | "new";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      setStep("existing");
      setCanResend(true);
      setMessage("De inloglink of bevestiging is ongeldig of verlopen. Vraag hieronder een nieuwe bevestigingsmail aan.");
    }
  }, []);

  function go(next: Step) {
    setStep(next);
    setMessage("");
    setPassword("");
    setBusy(false);
    setCanResend(false);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setCanResend(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(authErrorMessage(error, "login"));
        if (error.code === "email_not_confirmed") setCanResend(true);
        return;
      }
      router.replace("/feed");
    } catch {
      setMessage(networkErrorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setCanResend(false);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(authErrorMessage(error, "signup"));
        return;
      }
      if (data.session) {
        router.replace("/feed");
        return;
      }
      setCanResend(true);
      setMessage("Account aangemaakt. Controleer je e-mail (ook spam) om je account te bevestigen.");
    } catch {
      setMessage(networkErrorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (busy || !email) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      setMessage(
        error
          ? authErrorMessage(error, "signup")
          : "Bevestigingsmail opnieuw verstuurd. Controleer je inbox en spam.",
      );
    } catch {
      setMessage(networkErrorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <Link href="/">Terug naar home</Link>
      <h1>Inloggen</h1>

      {step === "choice" && (
        <section>
          <p>Kies hoe je verder wilt gaan.</p>
          <div className="login-choice">
            <button type="button" onClick={() => go("existing")}>
              Bestaande gebruiker
            </button>
            <button type="button" onClick={() => go("new")}>
              Nieuwe gebruiker
            </button>
          </div>
        </section>
      )}

      {step === "existing" && (
        <section>
          <h2>Bestaande gebruiker</h2>
          <form onSubmit={handleLogin}>
            <label htmlFor="existing-email">E-mailadres</label>
            <input
              id="existing-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="existing-password">Wachtwoord</label>
            <input
              id="existing-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="submit" disabled={busy}>
              {busy ? "Bezig..." : "Inloggen"}
            </button>
          </form>
          {message && <p role="status">{message}</p>}
          {canResend && (
            <button type="button" onClick={handleResend} disabled={busy || !email}>
              Bevestigingsmail opnieuw sturen
            </button>
          )}
          <button type="button" className="text-button" onClick={() => go("choice")}>
            ← Terug
          </button>
        </section>
      )}

      {step === "new" && (
        <section>
          <h2>Nieuwe gebruiker</h2>
          <p>Maak een account aan met je e-mailadres en een wachtwoord.</p>
          <form onSubmit={handleSignUp}>
            <label htmlFor="new-email">E-mailadres</label>
            <input
              id="new-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="new-password">Wachtwoord</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="submit" disabled={busy}>
              {busy ? "Bezig..." : "Account aanmaken"}
            </button>
          </form>
          {message && <p role="status">{message}</p>}
          {canResend && (
            <button type="button" onClick={handleResend} disabled={busy}>
              Bevestigingsmail opnieuw sturen
            </button>
          )}
          <button type="button" className="text-button" onClick={() => go("choice")}>
            ← Terug
          </button>
        </section>
      )}
    </main>
  );
}
