import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthContext } from "./get-auth-context";
import { isMissingSessionError } from "./session-errors";
import type { AuthGuardResult } from "./types";
import type { Database, Tre60Role } from "../db/types";

type Tre60SupabaseClient = SupabaseClient<Database, any, any, any, any>;

async function requireRole(
  supabase: Tre60SupabaseClient,
  allowedRoles: Tre60Role[]
): Promise<AuthGuardResult> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    if (isMissingSessionError(userError)) {
      return { ok: false, reason: "no_session" };
    }

    throw userError;
  }

  if (!user) return { ok: false, reason: "no_session" };

  const context = await getAuthContext(supabase);
  if (!context) return { ok: false, reason: "missing_context" };
  if (context.status === "disabled") return { ok: false, reason: "disabled" };
  if (context.status === "invited") return { ok: false, reason: "invited" };
  if (!context.role || !allowedRoles.includes(context.role)) {
    return { ok: false, reason: "wrong_role" };
  }

  return { ok: true, context };
}

export async function requireActiveUser(
  supabase: Tre60SupabaseClient
): Promise<AuthGuardResult> {
  return requireRole(supabase, ["admin", "employee", "customer"]);
}

export async function requireCustomer(
  supabase: Tre60SupabaseClient
): Promise<AuthGuardResult> {
  return requireRole(supabase, ["customer"]);
}

export async function requireStaff(
  supabase: Tre60SupabaseClient
): Promise<AuthGuardResult> {
  return requireRole(supabase, ["admin", "employee"]);
}
