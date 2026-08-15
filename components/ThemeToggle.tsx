"use client";

import { useState } from "react";
import { SunIcon, MoonIcon } from "./Icons";

/** Switches between the light and dark palettes and remembers the choice.
 *
 *  The theme lives in one place — data-theme on <html> — which the script in
 *  the layout has already set from localStorage or the device preference by the
 *  time this mounts. Reading it from the DOM on click rather than holding it in
 *  React state means the button has no state to get out of step with the page,
 *  and nothing here differs between the server render and the browser. */
export default function ThemeToggle() {
  // Empty on both the server and the first client render, so it can't cause a
  // mismatch; it only ever fills in after a tap.
  const [announcement, setAnnouncement] = useState("");

  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";

    root.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#090f17" : "#f5f7f9");

    // A private browsing window can refuse to store anything. Losing the
    // preference on the next visit is not worth breaking the button over.
    try {
      localStorage.setItem("theme", next);
    } catch {}

    setAnnouncement(next === "dark" ? "Dark theme" : "Light theme");
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        title="Switch between the light and dark theme"
        aria-label="Switch between the light and dark theme"
        className="h-9 w-9 inline-flex items-center justify-center rounded-full border cursor-pointer shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
      >
        <SunIcon size={15} className="icon-sun" />
        <MoonIcon size={15} className="icon-moon" />
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
