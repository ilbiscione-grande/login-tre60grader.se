import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createHandoffToken,
  createTre60AdminClient,
  encryptSessionPayload,
  getClientIp,
  getUserAgent,
  hashHandoffSecret,
  hashUserAgent,
  logAuthSecurityEvent
} from "@tre60/backend";
import type { Database, Tre60AuthContextRow } from "@tre60/backend";
import { getAdminSupabaseEnv, getAppUrls, getSecurityEnv, getServerSupabaseEnv } from "@tre60/config";

type HandoffRequestBody = {
  app?: string;
  next?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
  expiresIn?: number;
};

function getSafeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  if (value.startsWith("//")) {
    return "/";
  }

  return value;
}

function getTargetAppUrl(app: string, intraAppUrl: string, portalAppUrl: string) {
  return app === "portal" ? portalAppUrl : intraAppUrl;
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandoffRequestBody;
  const targetApp = body.app === "portal" ? "portal" : "intra";
  const nextPath = getSafeNextPath(body.next);
  const headerStore = await headers();
  const ip = getClientIp(headerStore);
  const userAgent = getUserAgent(headerStore);
  const admin = createTre60AdminClient(getAdminSupabaseEnv()) as any;

  if (!body.accessToken || !body.refreshToken || !body.tokenType) {
    await logAuthSecurityEvent(admin, "handoff_create", "failure", {
      ip,
      userAgent,
      metadata: { reason: "missing_session_tokens", targetApp }
    });
    return NextResponse.json({ error: "missing_session_tokens" }, { status: 400 });
  }

  const serverEnv = getServerSupabaseEnv();
  const authClient = createClient<Database>(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${body.accessToken}`
      }
    }
  });
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser(body.accessToken);

  if (userError || !user) {
    await logAuthSecurityEvent(admin, "handoff_create", "failure", {
      ip,
      userAgent,
      metadata: { reason: "invalid_session", targetApp }
    });
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }

  const { data: contextRows, error: contextError } = await authClient.rpc("tre60_auth_context");
  const row = Array.isArray(contextRows) ? (contextRows[0] as Tre60AuthContextRow | null) : null;

  if (contextError || !row) {
    await logAuthSecurityEvent(admin, "handoff_create", "failure", {
      identifier: user.email ?? user.id,
      ip,
      userAgent,
      metadata: { reason: "invalid_context", targetApp }
    });
    return NextResponse.json({ error: "invalid_context" }, { status: 401 });
  }

  if (row.status !== "active" || !row.role || !row.user_id) {
    await logAuthSecurityEvent(admin, "handoff_create", "failure", {
      identifier: user.email ?? user.id,
      ip,
      userAgent,
      metadata: { reason: "inactive_or_missing_role", targetApp, status: row.status, role: row.role }
    });
    return NextResponse.json({ error: "invalid_context" }, { status: 401 });
  }

  if (targetApp === "intra" && !["admin", "employee"].includes(row.role)) {
    await logAuthSecurityEvent(admin, "handoff_create", "failure", {
      identifier: user.email ?? user.id,
      ip,
      userAgent,
      metadata: { reason: "wrong_role", targetApp, role: row.role }
    });
    return NextResponse.json({ error: "wrong_role" }, { status: 403 });
  }

  if (targetApp === "portal" && row.role !== "customer") {
    await logAuthSecurityEvent(admin, "handoff_create", "failure", {
      identifier: user.email ?? user.id,
      ip,
      userAgent,
      metadata: { reason: "wrong_role", targetApp, role: row.role }
    });
    return NextResponse.json({ error: "wrong_role" }, { status: 403 });
  }

  const token = createHandoffToken();
  const securityEnv = getSecurityEnv();
  const encrypted = encryptSessionPayload(
    {
      access_token: body.accessToken,
      refresh_token: body.refreshToken,
      token_type: body.tokenType,
      expires_at: body.expiresAt,
      expires_in: body.expiresIn
    },
    securityEnv.authHandoffEncryptionKey
  );

  const expiresAt = new Date(Date.now() + 60_000).toISOString();

  const { error } = await admin.from("auth_handoffs").insert({
    id: token.id,
    user_id: row.user_id,
    target_app: targetApp,
    role: row.role,
    redirect_path: nextPath,
    secret_hash: hashHandoffSecret(token.secret),
    payload_ciphertext: encrypted.ciphertext,
    payload_iv: encrypted.iv,
    payload_auth_tag: encrypted.authTag,
    created_ip: ip,
    created_user_agent_hash: hashUserAgent(userAgent),
    expires_at: expiresAt
  });

  if (error) {
    await logAuthSecurityEvent(admin, "handoff_create", "failure", {
      identifier: user.email ?? user.id,
      ip,
      userAgent,
      metadata: { reason: "handoff_create_failed", targetApp }
    });
    return NextResponse.json({ error: "handoff_create_failed" }, { status: 500 });
  }

  const appUrls = getAppUrls();
  const targetUrl = new URL(
    "/auth/callback",
    getTargetAppUrl(targetApp, appUrls.intraAppUrl, appUrls.portalAppUrl)
  );
  targetUrl.searchParams.set("handoff", `${token.id}.${token.secret}`);
  targetUrl.searchParams.set("next", nextPath);

  await logAuthSecurityEvent(admin, "handoff_create", "success", {
    identifier: user.email ?? user.id,
    ip,
    userAgent,
    metadata: { targetApp, role: row.role, nextPath }
  });

  return NextResponse.json({ redirectTo: targetUrl.toString() });
}
