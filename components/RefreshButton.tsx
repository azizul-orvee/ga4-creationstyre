"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshDashboard } from "@/app/actions";
import { RefreshIcon } from "./Icons";

/** Lets the client pull the newest numbers without waiting for the cache to
 *  expire — useful right after a busy morning on the phones. */
export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    setMessage(null);
    startTransition(async () => {
      const result = await refreshDashboard();
      if (result.refreshed) router.refresh();
      else setMessage(`Just updated — try again in ${result.waitSeconds}s`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={refresh}
        disabled={isPending}
        className="h-9 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs cursor-pointer disabled:cursor-wait"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
      >
        <RefreshIcon size={14} className={isPending ? "animate-spin" : undefined} />
        <span className="hidden sm:inline">{isPending ? "Updating…" : "Refresh"}</span>
      </button>
      <span className="text-[10px] text-muted h-3" aria-live="polite">
        {message ?? ""}
      </span>
    </div>
  );
}
