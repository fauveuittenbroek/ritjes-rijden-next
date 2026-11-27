import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const CANONICAL_ORIGIN = "https://www.ritjes.com";

const PROTECTED_PREFIXES = ["/rides", "/feed", "/requests", "/account", "/admin"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function getUser(request: NextRequest): Promise<{ user: { id: string } | null; response: NextResponse }> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  return { user: data.user ? { id: data.user.id } : null, response };
}

export async function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const canonical = new URL(CANONICAL_ORIGIN);

  if (!isLocalhost && hostname !== canonical.hostname.toLowerCase()) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = canonical.protocol;
    canonicalUrl.host = canonical.host;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.search = "";
    url.searchParams.set("code", code);
    return NextResponse.redirect(url);
  }

  if (!isProtected(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const { user, response } = await getUser(request);
  if (user) return response;

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
