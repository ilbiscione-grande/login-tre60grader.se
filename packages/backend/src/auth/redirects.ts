import type { AuthContext, AuthGuardFailureReason } from "./types";

export function getAppRedirectForContext(context: AuthContext): string | null {
  if (context.status !== "active") return null;
  return context.redirectUrl;
}

export function getLoginRedirectForFailure(reason: AuthGuardFailureReason): string {
  switch (reason) {
    case "disabled":
      return "/blocked";
    case "invited":
      return "/setup-account";
    case "missing_context":
      return "/auth/error?code=missing_profile";
    case "wrong_role":
      return "/auth/error?code=wrong_role";
    case "no_session":
    default:
      return "/login";
  }
}
