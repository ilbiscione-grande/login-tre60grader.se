import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthContext } from "./types";
import { mapAuthContextRow } from "./types";
import type { Database } from "../db/types";

export async function getAuthContext(
  supabase: SupabaseClient<Database>
): Promise<AuthContext | null> {
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session) return null;

  const { data, error } = await supabase.rpc("tre60_auth_context", {});

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  return mapAuthContextRow(row);
}
