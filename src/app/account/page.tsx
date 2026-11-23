import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/account-form";
import { ProfileNameForm } from "@/components/profile-name-form";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Mijn account · Ritjes.com" };

function initialsFrom(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length) {
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
  }
  return email.slice(0, 1).toUpperCase() || "?";
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone, account_type")
    .eq("id", user.id)
    .maybeSingle();

  const metadataName = user.user_metadata?.display_name;
  const initialName = profile?.display_name?.trim() || (typeof metadataName === "string" ? metadataName : "");
  const phone = profile?.phone?.trim() || (typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : "");
  const accountType = profile?.account_type === "zakelijk" ? "Zakelijk" : "Particulier";
  const displayName = initialName || "Stel je naam in";

  return (
    <>
      <SiteHeader />
      <main className="account-page">
        <div className="account-head">
          <div>
            <span className="account-eyebrow">Mijn account</span>
            <h1>Hallo{initialName ? `, ${initialName.split(/\s+/)[0]}` : ""}</h1>
            <p>Bekijk en beheer je gegevens, naam en wachtwoord.</p>
          </div>
          <Link href="/feed" className="button-secondary">Naar overzicht</Link>
        </div>

        <div className="account-grid">
          <aside className="account-card account-summary">
            <div className="account-avatar" aria-hidden="true">{initialsFrom(initialName, user.email ?? "")}</div>
            <h2>{displayName}</h2>
            <p className="account-email">{user.email}</p>
            <span className="account-badge">Actief account</span>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{accountType}</dd>
              </div>
              <div>
                <dt>Telefoon</dt>
                <dd>{phone || "Niet ingevuld"}</dd>
              </div>
            </dl>
            <p className="account-note">
              Je e-mailadres en telefoonnummer zijn niet openbaar zichtbaar.
            </p>
          </aside>

          <div className="account-main">
            <section className="account-card">
              <h2>Profiel</h2>
              <p className="account-muted">Deze naam wordt getoond bij je verzoeken.</p>
              <ProfileNameForm userId={user.id} initialName={initialName} />
            </section>

            <section className="account-card">
              <h2>Wachtwoord</h2>
              <p className="account-muted">
                Je bent al ingelogd. Stel hier alleen een nieuw wachtwoord in als je dat wilt wijzigen.
              </p>
              <AccountForm />
            </section>

            <section className="account-card account-danger">
              <h2>Uitloggen</h2>
              <p className="account-muted">Log uit op dit apparaat. Je kunt daarna weer inloggen met je e-mailadres.</p>
              <LogoutButton />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
