// The session behind the dashboard's single login.
//
// There is one account and nothing to look up, so the session is a signed token
// in a cookie rather than a row in a store: the server can verify it on its own,
// which keeps this to one file and no database. The token is signed, not
// encrypted — anyone holding the cookie can read the payload, so it carries only
// a name and an expiry.
//
// Nothing here imports `next/headers`: proxy.ts needs the same verify step as
// the pages do, and it runs before any of that is available.

/** Name of the cookie the token travels in. */
export const SESSION_COOKIE = "cmt_session";

/** The only account there is. Baked in rather than stored, like the password. */
export const AUTHORISED_USER = "Nathan";

/** "Keep me signed in": long enough that the client sees the login screen about
 *  four times a year, and only on a device they chose to be remembered on. */
const REMEMBERED_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

/** Without that box ticked the token dies the same day, and the cookie itself
 *  goes when the browser closes — the right default on a borrowed machine. */
const SINGLE_DAY_LIFETIME_MS = 12 * 60 * 60 * 1000;

export type Session = {
  user: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  /** Whether the client asked to be remembered on this device. */
  remembered: boolean;
};

/** What goes over the wire. Short keys because it rides on every request. */
type Payload = { u: string; exp: number; r: 0 | 1 };

export function newSession(remembered: boolean): Session {
  const lifetime = remembered ? REMEMBERED_LIFETIME_MS : SINGLE_DAY_LIFETIME_MS;
  return { user: AUTHORISED_USER, expiresAt: Date.now() + lifetime, remembered };
}

/** Cookie attributes for a session. `secure` is passed in rather than derived
 *  from NODE_ENV: a production build served over plain http on a laptop would
 *  otherwise set a cookie the browser refuses to send back, and the login would
 *  loop with nothing to show for it. */
export function sessionCookieOptions(session: Session, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    // No maxAge for an unremembered session, which makes it a browser-session
    // cookie: closing the browser is a sign-out.
    ...(session.remembered ? { maxAge: Math.floor(REMEMBERED_LIFETIME_MS / 1000) } : {}),
  };
}

/** A remembered session is re-issued once it is past halfway, so a client who
 *  checks the dashboard now and then is never signed out mid-use. Re-signing on
 *  every request instead would put a Set-Cookie on all of them for nothing. */
export function needsRenewal(session: Session): boolean {
  if (!session.remembered) return false;
  return session.expiresAt - Date.now() < REMEMBERED_LIFETIME_MS / 2;
}

export async function signSession(session: Session): Promise<string> {
  const payload: Payload = { u: session.user, exp: session.expiresAt, r: session.remembered ? 1 : 0 };
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(body);
  return `${body}.${signature}`;
}

/** Returns the session a token stands for, or null if the token is missing,
 *  malformed, expired, or not signed by this server. */
export async function readSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;

  const separator = token.indexOf(".");
  if (separator < 1) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  try {
    if ((await sign(body)) !== signature) return null;

    const payload: Payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
    if (payload.u !== AUTHORISED_USER) return null;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;

    return { user: payload.u, expiresAt: payload.exp, remembered: payload.r === 1 };
  } catch {
    // Anything unparseable is treated the same as an unsigned token: no session.
    return null;
  }
}

/** Whether the request reached us over https, which decides if the session
 *  cookie can be marked Secure. Read from the forwarded header first, because
 *  behind Vercel's proxy the server itself only ever sees plain http. */
export function isSecureRequest(requestHeaders: Headers): boolean {
  const forwarded = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  if (forwarded) return forwarded === "https";

  const host = requestHeaders.get("host") ?? "";
  return !/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
}

/** Whether an attempt matches the one password. Both sides are hashed first so
 *  the comparison runs over two fixed-length digests, which stops the time it
 *  takes from saying how much of the password was right. */
export async function isCorrectPassword(attempt: string): Promise<boolean> {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    console.error("[auth] DASHBOARD_PASSWORD is not set — refusing every sign-in.");
    return false;
  }

  const [a, b] = await Promise.all([digest(attempt), digest(expected)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

let cachedKey: Promise<CryptoKey> | null = null;

function signingKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("AUTH_SECRET is not set — sessions cannot be signed. Generate one with: openssl rand -base64 32");
    }
    cachedKey = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
  return cachedKey;
}

async function sign(body: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(body));
  return base64UrlEncode(new Uint8Array(signature));
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

// btoa/atob rather than Buffer, so the same code runs wherever the proxy does.
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
