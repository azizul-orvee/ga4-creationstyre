// The gate in front of everything. Runs before a page is built, so an anonymous
// visitor never gets as far as a request to Google Analytics, and there is no
// moment where the dashboard renders and then hides itself.
//
// This is only the outer gate: it reads the cookie and nothing else, which is
// all it should do on a path that runs for every request. The checks that
// actually guard the numbers live next to them, in the page, the API route and
// the refresh action.

import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  isSecureRequest,
  needsRenewal,
  newSession,
  readSession,
  sessionCookieOptions,
  signSession,
} from "@/lib/session";

const LOGIN_PATH = "/login";

export default async function proxy(request: NextRequest) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;
  const onLoginPage = pathname === LOGIN_PATH;

  if (!session) {
    if (onLoginPage) return NextResponse.next();

    // A fetch gets a status it can act on; a browser gets the login screen.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: { "cache-control": "no-store" } });
    }

    const login = request.nextUrl.clone();
    login.pathname = LOGIN_PATH;
    login.search = "";
    // Only ever a path from this app, so it cannot send anyone off-site.
    if (pathname !== "/") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  if (onLoginPage) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/";
    dashboard.search = "";
    return NextResponse.redirect(dashboard);
  }

  const response = NextResponse.next();

  // Renewed on reads only. Doing it on a POST as well would race the sign-out
  // action, which is trying to clear the very cookie this would re-issue.
  if (request.method === "GET" && needsRenewal(session)) {
    const renewed = newSession(session.remembered);
    response.cookies.set(
      SESSION_COOKIE,
      await signSession(renewed),
      sessionCookieOptions(renewed, isSecureRequest(request.headers)),
    );
  }

  return response;
}

export const config = {
  // Everything except the build output and the icons — plus the login portrait,
  // which has to load for someone who is by definition not signed in yet.
  matcher: ["/((?!_next/|favicon.ico|icon.png|apple-icon.png|login-portrait.png).*)"],
};
