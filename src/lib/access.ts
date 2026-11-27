import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SiteAccess = {
  userId: string | null;
  email: string | null;
  constructionMode: boolean;
  isTester: boolean;
};

export const getSiteAccess = cache(async (): Promise<SiteAccess> => {
  const supabase = await createClient();
  const [userResult, modeResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("construction_mode"),
  ]);
  const user = userResult.data.user;
  const constructionMode = modeResult.error ? true : modeResult.data !== false;

  let isTester = false;
  if (user) {
    const { data } = await supabase.rpc("is_launch_tester");
    isTester = data === true;
  }

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    constructionMode,
    isTester,
  };
});

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/feed";
  return value;
}

export async function requireSiteAccess(nextPath: string): Promise<SiteAccess & { userId: string }> {
  const access = await getSiteAccess();
  if (!access.userId) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (access.constructionMode && !access.isTester) {
    redirect("/");
  }
  return { ...access, userId: access.userId };
}
