import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSessionError } from "./session-errors";
import type { Database, Tre60AuthSecurityContextRow } from "../db/types";

export type AuthSecurityContext = {
  userId: string;
  role: string | null;
  status: string | null;
  sessionAal: string | null;
  hasVerifiedMfa: boolean;
  mfaRequired: boolean;
  mfaSatisfied: boolean;
};

type Tre60SupabaseClient = SupabaseClient<Database, any, any, any, any>;

export async function getAuthSecurityContext(
  supabase: Tre60SupabaseClient
): Promise<AuthSecurityContext | null> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    if (isMissingSessionError(userError)) {
      return null;
    }

    throw userError;
  }

  if (!user) return null;

  const { data, error } = await supabase.rpc("tre60_auth_security_context");

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as Tre60AuthSecurityContextRow | null) : null;

  if (!row?.user_id) {
    return null;
  }

  return {
    userId: row.user_id,
    role: row.role,
    status: row.status,
    sessionAal: row.session_aal,
    hasVerifiedMfa: Boolean(row.has_verified_mfa),
    mfaRequired: Boolean(row.mfa_required),
    mfaSatisfied: Boolean(row.mfa_satisfied)
  };
}
