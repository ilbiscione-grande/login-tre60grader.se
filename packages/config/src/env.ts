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
    supabaseAnonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
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

export function getAppUrls() {
  return {
    loginAppUrl: requireEnv("NEXT_PUBLIC_LOGIN_APP_URL"),
    portalAppUrl: requireEnv("NEXT_PUBLIC_PORTAL_APP_URL"),
    intraAppUrl: requireEnv("NEXT_PUBLIC_INTRA_APP_URL")
  };
}
