import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient,
  getAuthContext,
  getAuthSecurityContext
} from "@tre60/backend";
import { getPublicSupabaseEnv, getServerSupabaseEnv } from "@tre60/config";
import { VerifyMfaForm } from "./verify-mfa-form";

export default async function VerifyMfaPage() {
  const cookieStore = await cookies();
  const serverEnv = getServerSupabaseEnv();
  const publicEnv = getPublicSupabaseEnv();
  const supabase = createTre60ServerClient(serverEnv, createSupabaseCookieAdapter(cookieStore));
  const context = await getAuthContext(supabase);
  const securityContext = await getAuthSecurityContext(supabase);

  if (!context || !securityContext) {
    redirect("/login");
  }

  if (context.status === "disabled") {
    redirect("/blocked");
  }

  if (context.status === "invited") {
    redirect("/setup-account");
  }

  if (context.role !== "admin" && context.role !== "employee") {
    redirect("/");
  }

  if (securityContext.mfaSatisfied) {
    redirect("/handoff?app=intra" as never);
  }

  return (
    <main className="shell">
      <section className="card stack">
        <p className="brand">Tre60 Grader</p>
        <h1 className="title">Verifiera MFA</h1>
        <p className="subtitle">
          Ditt interna konto kräver multifaktorautentisering innan du kan fortsätta.
        </p>
        <VerifyMfaForm
          supabaseUrl={publicEnv.supabaseUrl}
          supabaseAnonKey={publicEnv.supabaseAnonKey}
          authCookieDomain={publicEnv.authCookieDomain}
        />
        <a href="/logout">Logga ut</a>
      </section>
    </main>
  );
}
