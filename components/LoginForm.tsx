"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { signIn, type LoginState } from "@/app/login/actions";
import { AlertIcon, EyeIcon, EyeOffIcon, LockIcon } from "./Icons";

const EMPTY: LoginState = { error: null };

/** The whole sign-in screen. The portrait and the filled-in name are doing real
 *  work: this is the client's own dashboard, and it should greet him by name
 *  rather than ask who he is when there is only ever one answer.
 *
 *  The name arrives as a prop rather than imported from lib/session, which would
 *  drag the password check into the browser bundle. */
export default function LoginForm({ user, next }: { user: string; next: string }) {
  const [state, submit, pending] = useActionState(signIn, EMPTY);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="w-full max-w-[26rem]">
      <div
        className="card border rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 24px 60px -28px rgba(11, 22, 38, 0.55)" }}
      >
        {/* The brand across the top, so the screen is recognisably his before a
            single word is read. The red is kept to the same 3px rule the
            dashboard header uses: navy and red blended over a band this tall go
            through a muddy purple, and the stripe says the same thing cleanly. */}
        <div className="brand-rule" aria-hidden="true" />
        <div
          className="h-24"
          style={{ background: "linear-gradient(115deg, var(--brand-deep), var(--brand) 90%)" }}
          aria-hidden="true"
        />

        <div className="px-6 pb-7 sm:px-8">
          <div className="-mt-14 flex flex-col items-center text-center">
            <Image
              src="/login-portrait.png"
              alt=""
              width={256}
              height={256}
              priority
              className="w-28 h-28 rounded-3xl object-cover"
              style={{
                background: "#ffffff",
                border: "4px solid var(--surface-1)",
                boxShadow: "0 12px 28px -12px rgba(11, 22, 38, 0.5)",
              }}
            />

            <h1 className="mt-3.5 text-xl font-semibold tracking-tight text-primary">Welcome back, {user}</h1>
            <p className="mt-1 text-xs text-muted">Creations Mobile Tyres · enquiries &amp; ad spend</p>
          </div>

          <form action={submit} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-xs font-medium text-secondary">
                Signing in as
              </label>
              <input
                id="username"
                name="username"
                type="text"
                defaultValue={user}
                readOnly
                autoComplete="username"
                className="field h-11 w-full rounded-xl px-3.5 text-sm cursor-default"
                style={{ color: "var(--text-secondary)" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-secondary">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={revealed ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  required
                  placeholder="Enter your password"
                  aria-describedby={state.error ? "login-error" : undefined}
                  className="field h-11 w-full rounded-xl pl-3.5 pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setRevealed((shown) => !shown)}
                  // Typing a password on a phone with one thumb goes wrong often
                  // enough that hiding it should be a choice, not a rule.
                  aria-label={revealed ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 w-11 inline-flex items-center justify-center rounded-r-xl text-muted cursor-pointer"
                >
                  {revealed ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="mt-px h-4 w-4 shrink-0 cursor-pointer"
                style={{ accentColor: "var(--brand)" }}
              />
              <span>
                Remember this device
                <span className="block text-muted mt-0.5">
                  Stay signed in here for 90 days. Leave it unticked on a shared computer.
                </span>
              </span>
            </label>

            {state.error ? (
              <p
                id="login-error"
                role="alert"
                className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
                style={{ background: "var(--status-critical-bg)", color: "var(--status-critical)" }}
              >
                <AlertIcon size={15} className="mt-px shrink-0" />
                <span>{state.error}</span>
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="h-11 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-white cursor-pointer disabled:cursor-wait disabled:opacity-70"
              style={{ background: "var(--brand)" }}
            >
              <LockIcon size={15} />
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
        This dashboard shows live enquiry and ad spend figures.
        <br />
        Only you can see it.
      </p>
    </div>
  );
}
