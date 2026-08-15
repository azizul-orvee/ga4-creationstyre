"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth";
import { AUTHORISED_USER, isCorrectPassword } from "@/lib/session";

export type LoginState = { error: string | null };

// One password and no lockout would be a door anyone could pick at their
// leisure. Attempts are counted per caller, and a run of wrong ones buys a
// pause. Held in memory, so a restart forgives everyone — enough for a
// dashboard, and it costs nothing to run.
//
// During a lockout the right password is refused as well, which is the point:
// checking it anyway would let a guesser keep guessing at full speed. The wait
// runs from the last wrong attempt, so a locked-out caller cannot extend their
// own sentence by hammering.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; until: number }>();

export async function signIn(_state: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remembered = formData.get("remember") === "on";
  const destination = safeDestination(formData.get("next"));

  const caller = callerKey(await headers());

  const waitMinutes = lockoutMinutes(caller);
  if (waitMinutes) {
    return { error: `Too many attempts. Please try again in ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.` };
  }

  if (!password) return { error: "Please enter the password." };

  // The name field is filled in and read-only, so this only ever catches a
  // request that didn't come from the form.
  const nameMatches = username.toLowerCase() === AUTHORISED_USER.toLowerCase();
  if (!nameMatches || !(await isCorrectPassword(password))) {
    recordFailure(caller);
    return { error: "That password doesn't match. Mind the capitals." };
  }

  failures.delete(caller);
  await startSession(remembered);
  redirect(destination);
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}

/** Where to land after signing in. Only a path from this app is accepted, so a
 *  crafted `?next=` cannot bounce anyone to another site. */
function safeDestination(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/login")) return "/";
  return path;
}

function callerKey(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim();
  return forwarded || requestHeaders.get("x-real-ip") || "unknown";
}

function lockoutMinutes(caller: string): number {
  const record = failures.get(caller);
  if (!record || record.count < MAX_ATTEMPTS || record.until <= Date.now()) return 0;
  return Math.ceil((record.until - Date.now()) / 60000);
}

function recordFailure(caller: string): void {
  // Cheap sweep so a stream of requests from changing addresses can't grow the
  // map without bound.
  if (failures.size > 500) {
    for (const [key, record] of failures) if (record.until <= Date.now()) failures.delete(key);
  }

  const record = failures.get(caller);
  const expired = !record || record.until <= Date.now();
  failures.set(caller, {
    count: expired ? 1 : record.count + 1,
    until: Date.now() + WINDOW_MS,
  });
}
