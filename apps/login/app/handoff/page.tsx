import { getAppUrls, getPublicSupabaseEnv } from "@tre60/config";
import { HandoffClient } from "./handoff-client";

type HandoffPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function HandoffPage({ searchParams }: HandoffPageProps) {
  const params = (await searchParams) ?? {};
  const app = first(params.app) ?? "intra";
  const publicEnv = getPublicSupabaseEnv();
  const appUrls = getAppUrls();

  return (
    <HandoffClient
      app={app}
      supabaseUrl={publicEnv.supabaseUrl}
      supabaseAnonKey={publicEnv.supabaseAnonKey}
      authCookieDomain={publicEnv.authCookieDomain}
      intraAppUrl={appUrls.intraAppUrl}
      portalAppUrl={appUrls.portalAppUrl}
    />
  );
}
