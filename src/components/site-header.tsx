import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="site-header">
      <Link className="site-brand" href="/">
        <Image src="/Ritjes_logo.jpeg" alt="Ritjes.com" width={220} height={140} priority />
      </Link>
      <nav className="site-nav" aria-label="Hoofdnavigatie">
        <Link href="/rides">Bekijk ritjes</Link>
        {user ? (
          <>
            <Link href="/feed">Overzicht</Link>
            <Link href="/account" className="site-auth-ghost">Mijn account</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="site-auth-ghost">Inloggen</Link>
            <Link href="/login" className="site-auth-primary">Account aanmaken</Link>
          </>
        )}
      </nav>
    </header>
  );
}