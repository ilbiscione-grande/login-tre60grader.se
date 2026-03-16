import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../db/types";

export type BrowserSupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function createTre60BrowserClient(env: BrowserSupabaseEnv) {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
