import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient,
  getAuthContext
} from "@tre60/backend";
import { getPublicSupabaseEnv, getServerSupabaseEnv } from "@tre60/config";
import { SetupAccountForm } from "./setup-account-form";

export default async function SetupAccountPage() {
  const cookieStore = await cookies();
  const publicEnv = getPublicSupabaseEnv();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );
  const context = await getAuthContext(supabase);

  if (!context) {
    redirect("/login");
  }

  if (context.status === "active") {
    redirect("/");
  }

  if (context.status === "disabled") {
    redirect("/blocked");
  }

  return (
    <main>
      <h1>Slutför konto</h1>
      <p>Ditt konto finns, men behöver aktiveras innan du kan gå vidare.</p>
      <p>Välj ditt lösenord för att slutföra första setup.</p>
      <SetupAccountForm
        supabaseUrl={publicEnv.supabaseUrl}
        supabaseAnonKey={publicEnv.supabaseAnonKey}
        authCookieDomain={publicEnv.authCookieDomain}
      />
    </main>
  );
}
