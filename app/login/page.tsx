import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/auth";
import { AUTHORISED_USER } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  // Nothing here should ever turn up in a search result.
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // The proxy already sends signed-in visitors to the dashboard; this is here so
  // the page is still right if the proxy's matcher ever stops covering it.
  if (await getSession()) redirect("/");

  const requested = (await searchParams).next;
  const next = typeof requested === "string" ? requested : "/";

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10 safe-bottom">
      <LoginForm user={AUTHORISED_USER} next={next} />
    </main>
  );
}
