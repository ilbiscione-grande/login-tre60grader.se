import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../db/types";

export type BrowserSupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authCookieDomain?: string;
};

export function createTre60BrowserClient(env: BrowserSupabaseEnv) {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: {
      domain: env.authCookieDomain,
      sameSite: "lax",
      secure: env.supabaseUrl.startsWith("https://"),
      path: "/"
    }
  });
}
