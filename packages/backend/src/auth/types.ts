import type { Tre60AuthContextRow, Tre60Role, Tre60UserStatus } from "../db/types";

export type AuthContext = {
  userId: string;
  role: Tre60Role | null;
  status: Tre60UserStatus | null;
  defaultCompanyId: string | null;
  customerId: string | null;
  redirectUrl: string | null;
};

export type AuthGuardFailureReason =
  | "no_session"
  | "missing_context"
  | "disabled"
  | "invited"
  | "wrong_role";

export type AuthGuardResult =
  | { ok: true; context: AuthContext }
  | { ok: false; reason: AuthGuardFailureReason };

export function mapAuthContextRow(row: Tre60AuthContextRow | null | undefined): AuthContext | null {
  if (!row?.user_id) return null;

  return {
    userId: row.user_id,
    role: row.role,
    status: row.status,
    defaultCompanyId: row.default_company_id,
    customerId: row.customer_id,
    redirectUrl: row.redirect_url
  };
}
