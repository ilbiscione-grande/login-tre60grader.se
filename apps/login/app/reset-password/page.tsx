import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient,
  isMissingSessionError
} from "@tre60/backend";
import { getPublicSupabaseEnv, getServerSupabaseEnv } from "@tre60/config";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const publicEnv = getPublicSupabaseEnv();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (isMissingSessionError(error) || !user) {
    redirect("/auth/error?code=missing_reset_session");
  }

  if (error) {
    throw error;
  }

  return (
    <main>
      <h1>Nytt lösenord</h1>
      <p>Välj ett nytt lösenord för ditt konto.</p>
      <ResetPasswordForm
        supabaseUrl={publicEnv.supabaseUrl}
        supabaseAnonKey={publicEnv.supabaseAnonKey}
        authCookieDomain={publicEnv.authCookieDomain}
      />
    </main>
  );
}
