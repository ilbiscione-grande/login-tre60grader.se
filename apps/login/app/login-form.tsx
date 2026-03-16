"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTre60BrowserClient } from "@tre60/backend";

type Mode = "password" | "magic_link";

type LoginFormProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const LOGIN_RATE_LIMIT_KEY = "tre60-login-rate-limit";
const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000;

type RateLimitState = {
  failedAttempts: number;
  blockedUntil: number;
};

function readRateLimitState(): RateLimitState {
  if (typeof window === "undefined") {
    return { failedAttempts: 0, blockedUntil: 0 };
  }

  try {
    const raw = window.localStorage.getItem(LOGIN_RATE_LIMIT_KEY);
    if (!raw) return { failedAttempts: 0, blockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<RateLimitState>;

    return {
      failedAttempts: Number(parsed.failedAttempts ?? 0),
      blockedUntil: Number(parsed.blockedUntil ?? 0)
    };
  } catch {
    return { failedAttempts: 0, blockedUntil: 0 };
  }
}

function writeRateLimitState(state: RateLimitState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOGIN_RATE_LIMIT_KEY, JSON.stringify(state));
}

export function LoginForm({ supabaseUrl, supabaseAnonKey }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const env = {
    supabaseUrl,
    supabaseAnonKey
  };

  async function handlePasswordSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const rateLimit = readRateLimitState();
    if (rateLimit.blockedUntil > Date.now()) {
      setError("För många försök. Vänta 30 sekunder och försök igen.");
      return;
    }

    const supabase = createTre60BrowserClient(env);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      const nextFailedAttempts = rateLimit.failedAttempts + 1;
      const blockedUntil =
        nextFailedAttempts >= MAX_FAILED_ATTEMPTS ? Date.now() + COOLDOWN_MS : 0;

      writeRateLimitState({
        failedAttempts: blockedUntil ? 0 : nextFailedAttempts,
        blockedUntil
      });

      setError("Inloggningen misslyckades. Kontrollera uppgifterna och försök igen.");
      return;
    }

    writeRateLimitState({ failedAttempts: 0, blockedUntil: 0 });

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const supabase = createTre60BrowserClient(env);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (otpError) {
      setError("Det gick inte att skicka magic link just nu. Försök igen.");
      return;
    }

    setMessage("Magic link skickad. Kontrollera din e-post.");
  }

  async function handlePasswordReset() {
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Ange din e-postadress först.");
      return;
    }

    const supabase = createTre60BrowserClient(env);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (resetError) {
      setError("Det gick inte att skicka återställningslänken just nu.");
      return;
    }

    setMessage("Länk för lösenordsåterställning skickad. Kontrollera din e-post.");
  }

  const isPasswordMode = mode === "password";

  return (
    <section aria-labelledby="login-title">
      <h2 id="login-title" className="sr-only">
        Logga in
      </h2>

      <div className="switcher" role="tablist" aria-label="Val av inloggningssätt">
        <button
          type="button"
          role="tab"
          aria-selected={isPasswordMode}
          aria-controls="password-panel"
          onClick={() => setMode("password")}
          disabled={isPending}
        >
          Lösenord
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isPasswordMode}
          aria-controls="magic-link-panel"
          onClick={() => setMode("magic_link")}
          disabled={isPending}
        >
          Magic link
        </button>
      </div>

      <form
        onSubmit={isPasswordMode ? handlePasswordSignIn : handleMagicLink}
        noValidate
        id={isPasswordMode ? "password-panel" : "magic-link-panel"}
        className="form"
      >
        <div className="label-row">
          <label htmlFor="email">E-post</label>
        </div>
        <input
          className="input"
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-describedby="login-help"
          aria-invalid={error ? "true" : "false"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <p id="login-help" className="note">
          {isPasswordMode ? "Din vanliga inloggning." : "Skickar en länk till din e-post."}
        </p>

        {isPasswordMode ? (
          <>
            <div className="label-row">
              <label htmlFor="password">Lösenord</label>
              <button
                className="ghost-link"
                type="button"
                onClick={handlePasswordReset}
                disabled={isPending}
              >
                Glömt?
              </button>
            </div>
            <input
              className="input"
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-help"
              aria-invalid={error ? "true" : "false"}
              required
            />
            <p id="password-help" className="note">
              Minst 8 tecken för återställning.
            </p>
          </>
        ) : null}

        <button className="submit" type="submit" disabled={isPending}>
          {isPasswordMode ? "Logga in" : "Skicka magic link"}
        </button>
      </form>

      <div className="status status-ok" aria-live="polite" aria-atomic="true">
        {message ? <p>{message}</p> : null}
      </div>
      <div className="status status-error" aria-live="assertive" aria-atomic="true">
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
