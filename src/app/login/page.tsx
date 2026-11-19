"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { isPasswordValid, PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";
import { authErrorMessage, networkErrorMessage } from "@/lib/auth-errors";

type Step = "choice" | "existing" | "new" | "confirmation";
const LEGAL_VERSION = "1.0";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choice");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
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
    setDisplayName("");
    setAcceptedLegal(false);
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
    if (!isPasswordValid(password)) {
      setMessage(PASSWORD_REQUIREMENT_TEXT);
      return;
    }
    setBusy(true);
    setMessage("");
    setCanResend(false);
    if (!displayName.trim() || !acceptedLegal) {
      setMessage("Vul je naam in en accepteer de gebruiksvoorwaarden en privacyverklaring.");
      setBusy(false);
      return;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            terms_accepted: true,
            privacy_acknowledged: true,
            legal_version: LEGAL_VERSION,
            terms_version: LEGAL_VERSION,
            privacy_version: LEGAL_VERSION,
          },
        },
      });
      if (error) {
        setMessage(authErrorMessage(error, "signup"));
        return;
      }
      if (data.session) {
        router.replace("/feed");
        return;
      }
      setStep("confirmation");
      setCanResend(true);
      setMessage(`Bevestigingsmail verstuurd naar ${email}.`);
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
            <PasswordInput
              id="existing-password"
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
          <p>Maak een account aan met je e-mailadres, weergavenaam en een wachtwoord.</p>
          <form onSubmit={handleSignUp}>
            <label htmlFor="new-display-name">Voornaam of weergavenaam</label>
            <input
              id="new-display-name"
              type="text"
              autoComplete="name"
              maxLength={80}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <label htmlFor="new-email">E-mailadres</label>
            <input
              id="new-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p>Je e-mailadres moet eerst worden bevestigd via de e-mail die we sturen.</p>
            <label htmlFor="new-password">Wachtwoord</label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p>{PASSWORD_REQUIREMENT_TEXT}</p>
            <label className="legal-consent">
              <input
                type="checkbox"
                required
                checked={acceptedLegal}
                onChange={(event) => setAcceptedLegal(event.target.checked)}
              />
              <span>
                Ik ga akkoord met de <Link href="/voorwaarden" target="_blank" rel="noreferrer">gebruiksvoorwaarden</Link> en heb de{" "}
                <Link href="/privacyverklaring" target="_blank" rel="noreferrer">privacyverklaring</Link> gelezen.
              </span>
            </label>
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
      {step === "confirmation" && (
        <section>
          <h2>Bevestig je e-mailadres</h2>
          <p role="status">{message}</p>
          <p>Open de link in de e-mail om je e-mailadres te bevestigen.</p>
          <div className="confirmation-actions">
            {canResend && (
              <button type="button" onClick={handleResend} disabled={busy || !email}>
                {busy ? "Bezig..." : "Bevestigingsmail opnieuw sturen"}
              </button>
            )}
            <button type="button" className="button-primary" onClick={() => go("existing")}>
              Ik heb bevestigd — inloggen
            </button>
            <button type="button" className="text-button" onClick={() => go("new")}>
              Ander e-mailadres gebruiken
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
