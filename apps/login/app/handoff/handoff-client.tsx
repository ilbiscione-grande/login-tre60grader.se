"use client";

import { useEffect, useState } from "react";
import { createTre60BrowserClient } from "@tre60/backend";
import type { Tre60AuthContextRow } from "@tre60/backend";

function buildTargetUrl(
  app: string,
  intraAppUrl: string,
  portalAppUrl: string,
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
    token_type: string;
  }
) {
  const baseUrl = app === "portal" ? portalAppUrl : intraAppUrl;
  const target = new URL("/auth/callback", baseUrl);
  target.searchParams.set("access_token", session.access_token);
  target.searchParams.set("refresh_token", session.refresh_token);
  target.searchParams.set("token_type", session.token_type);

  if (typeof session.expires_at === "number") {
    target.searchParams.set("expires_at", String(session.expires_at));
  }

  if (typeof session.expires_in === "number") {
    target.searchParams.set("expires_in", String(session.expires_in));
  }

  target.searchParams.set("next", "/");
  return target.toString();
}

type HandoffClientProps = {
  app: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  authCookieDomain?: string;
  intraAppUrl: string;
  portalAppUrl: string;
};

export function HandoffClient({
  app,
  supabaseUrl,
  supabaseAnonKey,
  authCookieDomain,
  intraAppUrl,
  portalAppUrl
}: HandoffClientProps) {
  const [message, setMessage] = useState("Etablerar session...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createTre60BrowserClient({
        supabaseUrl,
        supabaseAnonKey,
        authCookieDomain
      });

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError || !session) {
        window.location.replace("/auth/error?code=handoff_missing_session");
        return;
      }

      const { data, error } = await supabase.rpc("tre60_auth_context");

      if (cancelled) return;

      if (error) {
        window.location.replace("/auth/error?code=handoff_missing_context");
        return;
      }

      const row = Array.isArray(data) ? (data[0] as Tre60AuthContextRow | null) : null;

      if (!row?.user_id || row.status !== "active") {
        window.location.replace("/auth/error?code=handoff_invalid_status");
        return;
      }

      if (app === "intra" && row.role !== "admin" && row.role !== "employee") {
        window.location.replace("/auth/error?code=handoff_wrong_role");
        return;
      }

      if (app === "portal" && row.role !== "customer") {
        window.location.replace("/auth/error?code=handoff_wrong_role");
        return;
      }

      setMessage("Skickar dig vidare...");
      window.location.replace(
        buildTargetUrl(app, intraAppUrl, portalAppUrl, {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type
        })
      );
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [app, authCookieDomain, intraAppUrl, portalAppUrl, supabaseAnonKey, supabaseUrl]);

  return (
    <main className="shell">
      <section className="card stack">
        <p className="brand">Tre60 Grader</p>
        <h1 className="title">Vidare</h1>
        <p className="subtitle">{message}</p>
      </section>
    </main>
  );
}
