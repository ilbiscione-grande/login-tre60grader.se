import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  consumeAuthRateLimit,
  createTre60AdminClient,
  createTre60ServerClient,
  getAuthRateLimitKey,
  getClientIp,
  getUserAgent,
  logAuthSecurityEvent,
  normalizeIdentifier
} from "@tre60/backend";
import { getAdminSupabaseEnv, getAppUrls, getServerSupabaseEnv } from "@tre60/config";

type Body = {
  email?: string;
};

const WINDOW = { maxAttempts: 5, windowSeconds: 900, blockSeconds: 1800 };

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const email = normalizeIdentifier(body.email ?? "");

  if (!email) {
    return NextResponse.json({ error: "missing_email" }, { status: 400 });
  }

  const headerStore = await headers();
  const ip = getClientIp(headerStore);
  const userAgent = getUserAgent(headerStore);
  const admin = createTre60AdminClient(getAdminSupabaseEnv()) as any;

  const rateLimit = await consumeAuthRateLimit(
    admin,
    "magic_link_send",
    getAuthRateLimitKey("magic_link_send", ip, email),
    WINDOW
  );

  if (rateLimit.is_blocked) {
    await logAuthSecurityEvent(admin, "magic_link_send", "blocked", {
      identifier: email,
      ip,
      userAgent,
      metadata: { retry_after_seconds: rateLimit.retry_after_seconds }
    });

    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: rateLimit.retry_after_seconds },
      { status: 429 }
    );
  }

  const appUrls = getAppUrls();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    {
      getAll() {
        return [];
      },
      setAll() {}
    }
  );
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrls.loginAppUrl}/auth/callback`
    }
  });

  await logAuthSecurityEvent(admin, "magic_link_send", error ? "failure" : "success", {
    identifier: email,
    ip,
    userAgent
  });

  if (error) {
    return NextResponse.json({ error: "magic_link_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
