function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getPublicSupabaseEnv() {
  return {
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    authCookieDomain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
    internalHandoffMode: process.env.NEXT_PUBLIC_INTERNAL_HANDOFF_MODE ?? "token"
  };
}

export function getServerSupabaseEnv() {
  return getPublicSupabaseEnv();
}

export function getAdminSupabaseEnv() {
  return {
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}

export function getSecurityEnv() {
  return {
    authHandoffEncryptionKey: requireEnv("AUTH_HANDOFF_ENCRYPTION_KEY"),
    authHandoffSharedSecret: requireEnv("AUTH_HANDOFF_SHARED_SECRET")
  };
}

export function getAppUrls() {
  return {
    loginAppUrl: requireEnv("NEXT_PUBLIC_LOGIN_APP_URL"),
    portalAppUrl: requireEnv("NEXT_PUBLIC_PORTAL_APP_URL"),
    intraAppUrl: requireEnv("NEXT_PUBLIC_INTRA_APP_URL")
  };
}
