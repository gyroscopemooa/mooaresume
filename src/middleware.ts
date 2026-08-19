import { NextRequest, NextResponse } from "next/server";

// Requests to a "dev.*" host (e.g. dev.mooaresume.com, dev.localhost) see the
// full in-development product homepage instead of the public Coming Soon
// landing, without changing the URL shown in the browser.
const DEV_HOST_PREFIX = "dev.";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  if (hostname.startsWith(DEV_HOST_PREFIX)) {
    return NextResponse.rewrite(new URL("/dev-home", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
