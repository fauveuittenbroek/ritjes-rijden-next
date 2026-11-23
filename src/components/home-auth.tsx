"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { isPasswordValid, PASSWORD_REQUIREMENT_TEXT } from "@/lib/password";
import { authErrorMessage, networkErrorMessage } from "@/lib/auth-errors";

type AuthMode = "login" | "register";
type AccountType = "particulier" | "zakelijk";

const LEGAL_VERSION = "1.0";

function getOAuthRedirectUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

const HomeAuthContext = createContext<{ open: (mode: AuthMode) => void } | null>(null);

export function HomeAuthProvider({
  children,
  initialMode = null,
}: {
  children: ReactNode;
  initialMode?: AuthMode | null;
}) {
  const [mode, setMode] = useState<AuthMode | null>(initialMode);
  return (
    <HomeAuthContext.Provider value={{ open: setMode }}>
      {children}
      {mode && <HomeAuthDialog key={mode} initialMode={mode} onClose={() => setMode(null)} />}
    </HomeAuthContext.Provider>
  );
}

export function HomeAuthButton({
  mode,
  className,
  children,
}: {
  mode: AuthMode;
  className?: string;
  children: ReactNode;
}) {
  const context = useContext(HomeAuthContext);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.location.hostname.endsWith(".netlify.app")) {
          const url = new URL("/login", "https://www.ritjes.com");
          url.searchParams.set("mode", mode);
          window.location.assign(url.toString());
          return;
        }
        context?.open(mode);
      }}
    >
      {children}
    </button>
  );
}

function HomeAuthDialog({ initialMode, onClose }: { initialMode: AuthMode; onClose: () => void }) {
  const router = useRouter();
  const [client] = useState(() => createClient());
  const [tab, setTab] = useState<AuthMode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [canResend, setCanResend] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("particulier");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleChecked, setGoogleChecked] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/providers")
      .then((response) => response.json())
      .then((data: { google?: boolean }) => {
        if (active) setGoogleEnabled(Boolean(data.google));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setGoogleChecked(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function switchTab(next: AuthMode) {
    if (next === "login" && !loginEmail && registerEmail) setLoginEmail(registerEmail);
    if (next === "register" && !registerEmail && loginEmail) setRegisterEmail(loginEmail);
    setTab(next);
    setMessage("");
    setCanResend(false);
    setConfirmation(false);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setCanResend(false);
    try {
      const { error } = await client.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) {
        setMessage(authErrorMessage(error, "login"));
        if (error.code === "email_not_confirmed") setCanResend(true);
        return;
      }
      onClose();
      router.replace("/feed");
      router.refresh();
    } catch {
      setMessage(networkErrorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!isPasswordValid(registerPassword)) {
      setMessage(PASSWORD_REQUIREMENT_TEXT);
      return;
    }
    if (!firstName.trim() || !acceptedLegal) {
      setMessage("Vul je voornaam in en accepteer de gebruiksvoorwaarden en privacyverklaring.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { data, error } = await client.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            display_name: displayName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
            account_type: accountType,
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
        onClose();
        router.replace("/feed");
        router.refresh();
        return;
      }
      setConfirmation(true);
      setCanResend(true);
      setMessage(`Bevestigingsmail verstuurd naar ${registerEmail}.`);
    } catch {
      setMessage(networkErrorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    const target = tab === "register" ? registerEmail : loginEmail;
    if (busy || !target) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.resend({ type: "signup", email: target });
      setMessage(
        error ? authErrorMessage(error, "signup") : "Bevestigingsmail opnieuw verstuurd. Controleer je inbox en spam.",
      );
    } catch {
      setMessage(networkErrorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    if (!googleEnabled) {
      setMessage("Google-login is nog niet geactiveerd. Gebruik je e-mailadres of vraag de beheerder om Google in te schakelen.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getOAuthRedirectUrl() },
      });
      if (error) {
        setMessage("Inloggen met Google is niet gelukt. Probeer het later opnieuw of gebruik je e-mailadres.");
        setBusy(false);
      }
    } catch {
      setMessage(networkErrorMessage);
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (busy) return;
    if (!loginEmail.trim()) {
      setMessage("Vul eerst je e-mailadres in om je wachtwoord opnieuw in te stellen.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/account`,
      });
      setMessage(
        error
          ? authErrorMessage(error, "login")
          : "Je ontvangt een e-mail om je wachtwoord opnieuw in te stellen. Daarna kun je het wijzigen bij Mijn account.",
      );
    } catch {
      setMessage(networkErrorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="home-auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Inloggen of account aanmaken"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="home-auth-card">
        <div className="home-auth-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Ritjes_logo.jpeg" alt="Ritjes.com" />
          <button type="button" className="home-auth-close" onClick={onClose} aria-label="Sluiten">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {tab === "login" ? (
          <section>
            <h2 className="home-auth-heading">Inloggen</h2>
            <button type="button" className="home-social-btn" onClick={handleGoogle} disabled={busy || !googleEnabled}>
              <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
              Doorgaan met Google
            </button>
            <p className="home-auth-legal-hint">
              Door verder te gaan met Google ga je akkoord met de{" "}
              <Link href="/voorwaarden" target="_blank" rel="noreferrer">gebruiksvoorwaarden</Link> en{" "}
              <Link href="/privacyverklaring" target="_blank" rel="noreferrer">privacyverklaring</Link>.
            </p>
            {googleChecked && !googleEnabled && (
              <p className="home-auth-hint">Google-login is nog niet ingesteld. Gebruik je e-mailadres of vraag de beheerder om Google te activeren.</p>
            )}

            <div className="home-auth-divider">of met e-mail</div>

            <form className="home-auth-form" onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="E-mail"
                aria-label="E-mailadres"
                autoComplete="email"
                required
                autoFocus
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
              />
              <PasswordInput
                autoComplete="current-password"
                aria-label="Wachtwoord"
                placeholder="Wachtwoord"
                required
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
              />
              <button type="submit" className="home-auth-submit" disabled={busy}>
                {busy ? "Bezig…" : "Inloggen"}
              </button>
            </form>
            <p className="home-auth-hint">
              <button type="button" className="home-auth-inline-link" onClick={handleForgotPassword}>
                Wachtwoord vergeten?
              </button>
            </p>

            {message && <p className="home-auth-message" role="status">{message}</p>}
            {canResend && (
              <button type="button" className="home-auth-text-button" onClick={handleResend} disabled={busy || !loginEmail}>
                Bevestigingsmail opnieuw sturen
              </button>
            )}

            <p className="home-auth-alt">Nog geen account? <button type="button" onClick={() => switchTab("register")}>Registreer hier</button></p>
            <p className="home-auth-note">Je e-mailadres en telefoonnummer zijn niet openbaar zichtbaar.</p>
          </section>
        ) : confirmation ? (
          <section>
            <h2 className="home-auth-heading">Bevestig je e-mailadres</h2>
            <p className="home-auth-message" role="status">{message}</p>
            <p>Open de link in de e-mail om je account te bevestigen.</p>
            <div className="home-auth-actions">
              <button type="button" className="home-auth-submit" onClick={handleResend} disabled={busy || !registerEmail}>
                {busy ? "Bezig…" : "Bevestigingsmail opnieuw sturen"}
              </button>
              <button type="button" className="home-auth-text-button" onClick={() => switchTab("login")}>
                Ik heb bevestigd — inloggen
              </button>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="home-auth-heading">Account aanmaken</h2>
            <button type="button" className="home-social-btn" onClick={handleGoogle} disabled={busy || !googleEnabled}>
              <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
              Snel registreren met Google
            </button>
            <p className="home-auth-legal-hint">
              Door verder te gaan met Google ga je akkoord met de{" "}
              <Link href="/voorwaarden" target="_blank" rel="noreferrer">gebruiksvoorwaarden</Link> en{" "}
              <Link href="/privacyverklaring" target="_blank" rel="noreferrer">privacyverklaring</Link>.
            </p>
            {googleChecked && !googleEnabled && (
              <p className="home-auth-hint">Google-login is nog niet ingesteld. Gebruik je e-mailadres of vraag de beheerder om Google te activeren.</p>
            )}

            <div className="home-auth-divider">of met e-mail</div>

            <div className="home-auth-segmented" role="group" aria-label="Soort account">
              <button type="button" className={accountType === "particulier" ? "active" : ""} onClick={() => setAccountType("particulier")}>Particulier</button>
              <button type="button" className={accountType === "zakelijk" ? "active" : ""} onClick={() => setAccountType("zakelijk")}>Zakelijk</button>
            </div>

            <form className="home-auth-form" onSubmit={handleRegister}>
              <div className="home-auth-name-row">
                <input
                  type="text"
                  placeholder="Voornaam"
                  aria-label="Voornaam"
                  autoComplete="given-name"
                  maxLength={60}
                  required
                  autoFocus
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Achternaam"
                  aria-label="Achternaam"
                  autoComplete="family-name"
                  maxLength={60}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
              <input
                type="email"
                placeholder="E-mail"
                aria-label="E-mailadres"
                autoComplete="email"
                required
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
              />
              <PasswordInput
                autoComplete="new-password"
                aria-label="Wachtwoord"
                placeholder="Wachtwoord"
                minLength={8}
                required
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
              />
              <p className="home-auth-hint">{PASSWORD_REQUIREMENT_TEXT}</p>
              <input
                type="tel"
                placeholder="Telefoonnummer (optioneel)"
                aria-label="Telefoonnummer (optioneel)"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <label className="home-auth-consent">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(event) => setAcceptedLegal(event.target.checked)}
                />
                <span>
                  Ik ga akkoord met de <Link href="/voorwaarden" target="_blank" rel="noreferrer">gebruiksvoorwaarden</Link> en heb de{" "}
                  <Link href="/privacyverklaring" target="_blank" rel="noreferrer">privacyverklaring</Link> gelezen.
                </span>
              </label>
              <button type="submit" className="home-auth-submit" disabled={busy || !acceptedLegal}>
                {busy ? "Bezig…" : "Registreer"}
              </button>
            </form>

            {message && <p className="home-auth-message" role="status">{message}</p>}
            {canResend && (
              <button type="button" className="home-auth-text-button" onClick={handleResend} disabled={busy || !registerEmail}>
                Bevestigingsmail opnieuw sturen
              </button>
            )}

            <p className="home-auth-alt">Heb je al een account? <button type="button" onClick={() => switchTab("login")}>Inloggen</button></p>
            <p className="home-auth-note">Je telefoonnummer is optioneel en wordt alleen gedeeld met de rijder of plaatser waarmee je een rit afspreekt.</p>
          </section>
        )}
      </div>
    </div>
  );
}
