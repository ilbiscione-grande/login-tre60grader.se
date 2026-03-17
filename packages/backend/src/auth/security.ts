type RateLimitResponse = {
  is_blocked: boolean;
  retry_after_seconds: number;
  attempt_count: number;
};

type RateLimitWindow = {
  maxAttempts: number;
  windowSeconds: number;
  blockSeconds: number;
};

export function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export function getClientIp(headerStore: Headers) {
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export function getUserAgent(headerStore: Headers) {
  return headerStore.get("user-agent") ?? null;
}

export function getAuthRateLimitKey(scope: string, ip: string | null, identifier?: string | null) {
  const safeIdentifier = identifier ? normalizeIdentifier(identifier) : "";
  return `${scope}:${ip ?? "unknown"}:${safeIdentifier}`;
}

export async function getAuthRateLimitStatus(
  admin: any,
  scope: string,
  key: string
): Promise<RateLimitResponse> {
  const { data, error } = await admin.rpc("tre60_auth_rate_limit_status", {
    p_scope: scope,
    p_key: key
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as RateLimitResponse | undefined) : undefined;
  return row ?? { is_blocked: false, retry_after_seconds: 0, attempt_count: 0 };
}

export async function consumeAuthRateLimit(
  admin: any,
  scope: string,
  key: string,
  window: RateLimitWindow
): Promise<RateLimitResponse> {
  const { data, error } = await admin.rpc("tre60_consume_auth_rate_limit", {
    p_scope: scope,
    p_key: key,
    p_max_attempts: window.maxAttempts,
    p_window_seconds: window.windowSeconds,
    p_block_seconds: window.blockSeconds
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as RateLimitResponse | undefined) : undefined;
  return row ?? { is_blocked: false, retry_after_seconds: 0, attempt_count: 0 };
}

export async function clearAuthRateLimit(admin: any, scope: string, key: string) {
  const { error } = await admin.rpc("tre60_clear_auth_rate_limit", {
    p_scope: scope,
    p_key: key
  });

  if (error) {
    throw error;
  }
}

export async function logAuthSecurityEvent(
  admin: any,
  eventType: string,
  outcome: "success" | "failure" | "blocked",
  options: {
    identifier?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const { error } = await admin.rpc("tre60_log_auth_security_event", {
    p_event_type: eventType,
    p_outcome: outcome,
    p_identifier: options.identifier ?? null,
    p_ip: options.ip ?? null,
    p_user_agent: options.userAgent ?? null,
    p_metadata: options.metadata ?? {}
  });

  if (error) {
    throw error;
  }
}
