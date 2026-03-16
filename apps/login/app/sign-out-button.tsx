"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTre60BrowserClient } from "@tre60/backend";

type SignOutButtonProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authCookieDomain?: string;
};

export function SignOutButton({
  supabaseUrl,
  supabaseAnonKey,
  authCookieDomain
}: SignOutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    const supabase = createTre60BrowserClient({
      supabaseUrl,
      supabaseAnonKey,
      authCookieDomain
    });

    await supabase.auth.signOut();

    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={handleSignOut} disabled={isPending}>
      Logga ut
    </button>
  );
}
