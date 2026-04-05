type AuthLikeError = {
  name?: string;
  message?: string;
};

export function isMissingSessionError(error: AuthLikeError | null | undefined): boolean {
  if (!error) {
    return false;
  }

  if (error.name === "AuthSessionMissingError") {
    return true;
  }

  const message = (error.message ?? "").toLowerCase();

  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token") && message.includes("already used")
  );
}
