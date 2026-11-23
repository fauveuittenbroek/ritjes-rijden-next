import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_ORIGIN = "https://www.ritjes.com";

export function middleware(request: NextRequest) {
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
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
