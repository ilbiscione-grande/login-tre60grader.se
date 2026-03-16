import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient,
  getAppRedirectForContext,
  getAuthContext
} from "@tre60/backend";
import { getPublicSupabaseEnv, getServerSupabaseEnv } from "@tre60/config";
import { LoginForm } from "./login-form";
import { SignOutButton } from "./sign-out-button";

export default async function LoginIndexPage() {
  const cookieStore = await cookies();
  const serverEnv = getServerSupabaseEnv();
  const publicEnv = getPublicSupabaseEnv();
  const supabase = createTre60ServerClient(serverEnv, createSupabaseCookieAdapter(cookieStore));
  const context = await getAuthContext(supabase);

  if (!context) {
    return (
      <main className="shell">
        <section className="card">
          <p className="brand">Tre60 Grader</p>
          <h1 className="title">Login</h1>
          <p className="subtitle">Fortsätt till rätt arbetsyta.</p>
          <div className="form-block">
            <LoginForm
              supabaseUrl={publicEnv.supabaseUrl}
              supabaseAnonKey={publicEnv.supabaseAnonKey}
              authCookieDomain={publicEnv.authCookieDomain}
            />
          </div>
        </section>
      </main>
    );
  }

  if (context.status === "disabled") {
    redirect("/blocked");
  }

  if (context.status === "invited") {
    redirect("/setup-account");
  }

  const appRedirect = getAppRedirectForContext(context);
  if (appRedirect) {
    redirect(appRedirect as never);
  }

  return (
    <main className="shell">
      <section className="card stack">
        <p className="brand">Tre60 Grader</p>
        <h1 className="title">Ingen destination</h1>
        <p className="subtitle">Kontot saknar en giltig appkoppling.</p>
        <a href="/logout">Logga ut</a>
        <SignOutButton
          supabaseUrl={publicEnv.supabaseUrl}
          supabaseAnonKey={publicEnv.supabaseAnonKey}
          authCookieDomain={publicEnv.authCookieDomain}
        />
      </section>
    </main>
  );
}
