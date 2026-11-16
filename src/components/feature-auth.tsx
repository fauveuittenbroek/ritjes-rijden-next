"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useFeatureAuth() {
  const router = useRouter();
  const [client] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user.id ?? null);
      if (!session) router.replace("/login");
    });
    client.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error && error.name !== "AuthSessionMissingError") {
        setError("Inloggen controleren is mislukt. Probeer de pagina opnieuw te laden.");
      } else if (!data.user) {
        router.replace("/login");
      } else {
        setUserId(data.user.id);
      }
      setLoading(false);
    }).catch(() => {
      if (active) { setError("Inloggen controleren is mislukt. Probeer de pagina opnieuw te laden."); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client, router]);

  return { client, userId, loading, error };
}

export type RideRequest = {
  id: string; type: "goederen" | "personen"; item_description: string | null;
  num_people: number | null; note: string | null; vertrekplaats: string; bestemming: string;
  ophaaladres: string | null; reward: number | null; scheduled_at: string | null;
  deadline_date: string | null; status: string; created_by: string; claimed_by: string | null;
  photo_path: string | null; created_at: string;
};
