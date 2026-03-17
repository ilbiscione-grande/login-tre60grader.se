import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthContext } from "./types";
import { mapAuthContextRow } from "./types";
import type { Database } from "../db/types";

type Tre60SupabaseClient = SupabaseClient<Database, any, any, any, any>;

export async function getAuthContext(
  supabase: Tre60SupabaseClient
): Promise<AuthContext | null> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase.rpc("tre60_auth_context");

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  return mapAuthContextRow(row);
}
