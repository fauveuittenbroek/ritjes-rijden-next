import type { Metadata } from "next";
import { HomeAuthButton, HomeAuthProvider } from "@/components/home-auth";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Inloggen · Ritjes.com" };

type SearchParams = Promise<{ error?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawError = params.error;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;

  return (
    <>
      <SiteHeader showAuth={false} />
      <main className="login-page">
        <HomeAuthProvider initialMode="login">
          <div className="login-shell">
            <section className="login-intro">
              <span className="login-eyebrow">Ritjes.com</span>
              <h1>Welkom terug</h1>
              <p>Log in om een ritje te plaatsen, te accepteren of je account te beheren.</p>
              <ul className="login-points">
                <li>Bekijk ritjes gratis en zonder account</li>
                <li>Reageer met een acceptatie of tegenvoorstel</li>
                <li>Beoordeel elkaar na de rit</li>
              </ul>
            </section>

            <section className="login-card">
              <h2>Inloggen of account aanmaken</h2>
              <p>Het inlogscherm opent direct. Kies daar of je inlogt of een account aanmaakt.</p>

              {error === "auth" && (
                <p className="auth-alert" role="alert">
                  De inloglink of bevestiging is ongeldig of verlopen. Log opnieuw in of vraag een nieuwe bevestigingsmail aan.
                </p>
              )}

              <div className="login-card-actions">
                <HomeAuthButton mode="login" className="button-primary">Inloggen</HomeAuthButton>
                <HomeAuthButton mode="register" className="button-secondary">Account aanmaken</HomeAuthButton>
              </div>

              <p className="login-small">Je e-mailadres en telefoonnummer zijn niet openbaar zichtbaar.</p>
            </section>
          </div>
        </HomeAuthProvider>
      </main>
    </>
  );
}