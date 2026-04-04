"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SetupAccountFormProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authCookieDomain?: string;
};

export function SetupAccountForm({
  supabaseUrl,
  supabaseAnonKey,
  authCookieDomain
}: SetupAccountFormProps) {
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

    const activateResponse = await fetch("/api/auth/setup-account", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    if (!activateResponse.ok) {
      const payload = (await activateResponse.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;
      setError(payload?.message ?? "Det gick inte att spara lösenordet.");
      return;
    }

    setMessage("Kontot är aktiverat. Du skickas vidare.");
    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="password">Välj lösenord</label>
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
        Slutför konto
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
