import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "../db/types";

export type ServerSupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function createTre60ServerClient(
  env: ServerSupabaseEnv,
  cookies: CookieMethodsServer
) {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies
  });
}
