import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/account-form";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = { title: "Account · Ritjes Rijden" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main>
      <Link href="/feed">Terug naar overzicht</Link>
      <h1>Account</h1>
      <p>Ingelogd als {user.email}.</p>
      <h2>Wachtwoord wijzigen (optioneel)</h2>
      <p>
        Je bent al ingelogd en kunt direct met je wachtwoord inloggen. Alleen als je je wachtwoord wilt
        wijzigen, stel je hier een nieuw wachtwoord in.
      </p>
      <AccountForm />
      <h2>Uitloggen</h2>
      <LogoutButton />
    </main>
  );
}
