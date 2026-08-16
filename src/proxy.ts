import { NextRequest, NextResponse } from "next/server";

const redirects: Record<string, string> = {
  "/start": "/begin",
  "/analyze": "/begin",
  "/sample": "/examples",
};

const privatePrefixes = ["/analysis", "/analyze", "/auth", "/begin", "/entry", "/onboarding", "/pro", "/quick", "/result", "/sample", "/start"];

export function proxy(request: NextRequest) {
  const destination = redirects[request.nextUrl.pathname];
  if (destination) return NextResponse.redirect(new URL(destination, request.url));

  const response = NextResponse.next();
  if (privatePrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
