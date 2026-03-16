"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTre60BrowserClient } from "@tre60/backend";

type ResetPasswordFormProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authCookieDomain?: string;
};

export function ResetPasswordForm({
  supabaseUrl,
  supabaseAnonKey,
  authCookieDomain
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }

    const supabase = createTre60BrowserClient({
      supabaseUrl,
      supabaseAnonKey,
      authCookieDomain
    });

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Det gick inte att uppdatera lösenordet.");
      return;
    }

    setMessage("Lösenord uppdaterat. Du skickas vidare.");
    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="password">Nytt lösenord</label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <label htmlFor="confirmPassword">Bekräfta lösenord</label>
      <input
        id="confirmPassword"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
      />

      <button type="submit" disabled={isPending}>
        Spara nytt lösenord
      </button>

      <div aria-live="polite" aria-atomic="true">
        {message ? <p>{message}</p> : null}
      </div>
      <div aria-live="assertive" aria-atomic="true">
        {error ? <p>{error}</p> : null}
      </div>
    </form>
  );
}
