import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  createHandoffToken,
  createSupabaseCookieAdapter,
  createTre60AdminClient,
  createTre60ServerClient,
  encryptSessionPayload,
  getAuthContext,
  hashHandoffSecret,
  hashUserAgent
} from "@tre60/backend";
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

  if (!body.accessToken || !body.refreshToken || !body.tokenType) {
    return NextResponse.json({ error: "missing_session_tokens" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );
  const context = await getAuthContext(supabase);

  if (!context || context.status !== "active" || !context.role) {
    return NextResponse.json({ error: "invalid_context" }, { status: 401 });
  }

  if (targetApp === "intra" && !["admin", "employee"].includes(context.role)) {
    return NextResponse.json({ error: "wrong_role" }, { status: 403 });
  }

  if (targetApp === "portal" && context.role !== "customer") {
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

  const admin = createTre60AdminClient(getAdminSupabaseEnv()) as any;
  const expiresAt = new Date(Date.now() + 60_000).toISOString();

  const { error } = await admin.from("auth_handoffs").insert({
    id: token.id,
    user_id: context.userId,
    target_app: targetApp,
    role: context.role,
    redirect_path: nextPath,
    secret_hash: hashHandoffSecret(token.secret),
    payload_ciphertext: encrypted.ciphertext,
    payload_iv: encrypted.iv,
    payload_auth_tag: encrypted.authTag,
    created_ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    created_user_agent_hash: hashUserAgent(headerStore.get("user-agent")),
    expires_at: expiresAt
  });

  if (error) {
    return NextResponse.json({ error: "handoff_create_failed" }, { status: 500 });
  }

  const appUrls = getAppUrls();
  const targetUrl = new URL(
    "/auth/callback",
    getTargetAppUrl(targetApp, appUrls.intraAppUrl, appUrls.portalAppUrl)
  );
  targetUrl.searchParams.set("handoff", `${token.id}.${token.secret}`);
  targetUrl.searchParams.set("next", nextPath);

  return NextResponse.json({ redirectTo: targetUrl.toString() });
}
