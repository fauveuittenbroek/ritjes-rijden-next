"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [client] = useState(() => createClient());
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await client.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={busy}>
      {busy ? "Bezig..." : "Uitloggen"}
    </button>
  );
}
