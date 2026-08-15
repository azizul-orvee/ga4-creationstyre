"use client";

import { useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { SignOutIcon } from "./Icons";

/** Sits beside Refresh in the header. Icon-only on a phone, where the range
 *  pills and the refresh button have already claimed the row. */
export default function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      title="Sign out"
      aria-label="Sign out"
      className="h-9 inline-flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 text-xs cursor-pointer disabled:cursor-wait"
      style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
    >
      <SignOutIcon size={14} />
      <span className="hidden sm:inline">{isPending ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
