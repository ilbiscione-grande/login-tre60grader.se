import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient,
  getLoginRedirectForFailure,
  requireCustomer
} from "@tre60/backend";
import { getAppUrls, getServerSupabaseEnv } from "@tre60/config";

export default async function PortalHomePage() {
  const cookieStore = await cookies();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );
  const guard = await requireCustomer(supabase);

  if (!guard.ok) {
    const destination = getLoginRedirectForFailure(guard.reason);
    const { loginAppUrl } = getAppUrls();
    redirect(`${loginAppUrl}${destination}`);
  }

  return (
    <main>
      <h1>Kundportal</h1>
      <p>Inloggad kund: {guard.context.userId}</p>
      <p>Kund-id: {guard.context.customerId ?? "saknas"}</p>
    </main>
  );
}
