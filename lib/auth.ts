// The dashboard's side of the session: reading the cookie during a render, and
// setting or clearing it from a Server Action.
//
// proxy.ts turns anonymous visitors away before a page is ever built, but that
// is the outer gate, not the lock. These checks sit next to the data itself, so
// a route added later is protected whether or not anyone remembers to update
// the proxy's matcher.

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  isSecureRequest,
  newSession,
  readSession,
  sessionCookieOptions,
  signSession,
  type Session,
} from "@/lib/session";

/** The signed-in client, or null. Memoised for the render pass, so a page and
 *  the components under it share one cookie read. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSession(token);
});

/** The signed-in client, or a redirect to the login screen. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function startSession(remembered: boolean): Promise<void> {
  const session = newSession(remembered);
  const secure = isSecureRequest(await headers());
  (await cookies()).set(SESSION_COOKIE, await signSession(session), sessionCookieOptions(session, secure));
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
