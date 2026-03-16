import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/types";

export type AdminSupabaseEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

export function createTre60AdminClient(env: AdminSupabaseEnv) {
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
