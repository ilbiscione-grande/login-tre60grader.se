import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient,
  getLoginRedirectForFailure,
  requireStaff
} from "@tre60/backend";
import { getAppUrls, getServerSupabaseEnv } from "@tre60/config";

export default async function IntraHomePage() {
  const cookieStore = await cookies();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );
  const guard = await requireStaff(supabase);

  if (!guard.ok) {
    const destination = getLoginRedirectForFailure(guard.reason);
    const { loginAppUrl } = getAppUrls();
    redirect(`${loginAppUrl}${destination}`);
  }

  return (
    <main>
      <h1>Intranät</h1>
      <p>Inloggad användare: {guard.context.userId}</p>
      <p>Roll: {guard.context.role}</p>
      <p>Default company: {guard.context.defaultCompanyId ?? "saknas"}</p>
    </main>
  );
}
