import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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
  matcher: ["/", "/login"],
};
