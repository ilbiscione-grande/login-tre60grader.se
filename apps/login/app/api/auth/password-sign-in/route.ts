import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearAuthRateLimit,
  consumeAuthRateLimit,
  createTre60AdminClient,
  getAuthRateLimitKey,
  getAuthRateLimitStatus,
  getClientIp,
  getUserAgent,
  logAuthSecurityEvent,
  normalizeIdentifier
} from "@tre60/backend";
import { getAdminSupabaseEnv } from "@tre60/config";

type Body = {
  email?: string;
  mode?: "precheck" | "result";
  outcome?: "success" | "failure";
  reason?: string;
};

const WINDOW = { maxAttempts: 5, windowSeconds: 600, blockSeconds: 900 };

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const email = normalizeIdentifier(body.email ?? "");
  const mode = body.mode ?? "precheck";

  if (!email) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const headerStore = await headers();
  const ip = getClientIp(headerStore);
  const userAgent = getUserAgent(headerStore);
  const admin = createTre60AdminClient(getAdminSupabaseEnv()) as any;

  const ipKey = getAuthRateLimitKey("password_sign_in_ip", ip);
  const identifierKey = getAuthRateLimitKey("password_sign_in_identifier", null, email);

  const [ipStatus, identifierStatus] = await Promise.all([
    getAuthRateLimitStatus(admin, "password_sign_in_ip", ipKey),
    getAuthRateLimitStatus(admin, "password_sign_in_identifier", identifierKey)
  ]);

  if (ipStatus.is_blocked || identifierStatus.is_blocked) {
    await logAuthSecurityEvent(admin, "password_sign_in", "blocked", {
      identifier: email,
      ip,
      userAgent,
      metadata: {
        source: ipStatus.is_blocked ? "ip" : "identifier",
        retry_after_seconds: Math.max(
          ipStatus.retry_after_seconds,
          identifierStatus.retry_after_seconds
        )
      }
    });

    return NextResponse.json(
      {
        error: "rate_limited",
        retryAfterSeconds: Math.max(
          ipStatus.retry_after_seconds,
          identifierStatus.retry_after_seconds
        )
      },
      { status: 429 }
    );
  }

  if (mode === "precheck") {
    return NextResponse.json({ ok: true });
  }

  if (body.outcome === "failure") {
    const [ipResult, identifierResult] = await Promise.all([
      consumeAuthRateLimit(admin, "password_sign_in_ip", ipKey, WINDOW),
      consumeAuthRateLimit(admin, "password_sign_in_identifier", identifierKey, WINDOW),
      logAuthSecurityEvent(admin, "password_sign_in", "failure", {
        identifier: email,
        ip,
        userAgent,
        metadata: {
          reason: body.reason ?? "browser_sign_in_failed"
        }
      })
    ]);

    const retryAfterSeconds = Math.max(
      ipResult.retry_after_seconds,
      identifierResult.retry_after_seconds
    );

    if (ipResult.is_blocked || identifierResult.is_blocked) {
      return NextResponse.json(
        {
          error: "rate_limited",
          retryAfterSeconds
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  if (body.outcome !== "success") {
    return NextResponse.json({ error: "invalid_result" }, { status: 400 });
  }

  await Promise.all([
    clearAuthRateLimit(admin, "password_sign_in_ip", ipKey),
    clearAuthRateLimit(admin, "password_sign_in_identifier", identifierKey),
    logAuthSecurityEvent(admin, "password_sign_in", "success", {
      identifier: email,
      ip,
      userAgent
    })
  ]);

  return NextResponse.json({ ok: true });
}
