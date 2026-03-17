"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTre60BrowserClient } from "@tre60/backend";

type VerifyMfaFormProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authCookieDomain?: string;
};

type TotpFactor = {
  id: string;
  factor_type?: string;
  status?: string;
  friendly_name?: string | null;
};

export function VerifyMfaForm({
  supabaseUrl,
  supabaseAnonKey,
  authCookieDomain
}: VerifyMfaFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [factor, setFactor] = useState<TotpFactor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoadingFactor, setIsLoadingFactor] = useState(true);
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(
    () =>
      createTre60BrowserClient({
        supabaseUrl,
        supabaseAnonKey,
        authCookieDomain
      }),
    [authCookieDomain, supabaseAnonKey, supabaseUrl]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFactor() {
      setIsLoadingFactor(true);
      setError(null);

      const mfa = (supabase.auth as any).mfa;
      const { data, error: factorError } = await mfa.listFactors();

      if (cancelled) return;

      if (factorError) {
        setError("Det gick inte att läsa MFA-status just nu.");
        setIsLoadingFactor(false);
        return;
      }

      const totpFactors = Array.isArray(data?.totp) ? (data.totp as TotpFactor[]) : [];
      const verifiedFactor =
        totpFactors.find((entry) => entry.status === "verified") ?? totpFactors[0] ?? null;

      if (!verifiedFactor) {
        setError("Kontot saknar en verifierad MFA-faktor.");
        setIsLoadingFactor(false);
        return;
      }

      setFactor(verifiedFactor);
      setIsLoadingFactor(false);
    }

    void loadFactor();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!factor) {
      setError("Ingen verifierad MFA-faktor hittades.");
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Ange den sexsiffriga koden från din autentiseringsapp.");
      return;
    }

    const mfa = (supabase.auth as any).mfa;
    const { data: challengeData, error: challengeError } = await mfa.challenge({
      factorId: factor.id
    });

    if (challengeError || !challengeData?.id) {
      setError("Det gick inte att starta MFA-verifieringen.");
      return;
    }

    const { error: verifyError } = await mfa.verify({
      factorId: factor.id,
      challengeId: challengeData.id,
      code: code.trim()
    });

    if (verifyError) {
      setError("Koden kunde inte verifieras. Försök igen.");
      return;
    }

    setMessage("Verifiering klar. Du skickas vidare.");
    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="verify-mfa-title">
      <h2 id="verify-mfa-title" className="sr-only">
        Verifiera MFA
      </h2>

      <form onSubmit={handleSubmit} className="form" noValidate>
        <div className="label-row">
          <label htmlFor="totp-code">Kod från autentiseringsapp</label>
        </div>
        <input
          className="input"
          id="totp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-invalid={error ? "true" : "false"}
          disabled={isPending || isLoadingFactor}
          required
        />
        <p className="note">
          {factor?.friendly_name
            ? `Verifierar med ${factor.friendly_name}.`
            : "Ange den aktuella sexsiffriga koden."}
        </p>

        <button className="submit" type="submit" disabled={isPending || isLoadingFactor}>
          Verifiera
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
