import { NextResponse } from "next/server";
import {
  createTre60AdminClient,
  decryptSessionPayload,
  safeEqualHexHash,
  splitHandoffToken,
  hashHandoffSecret
} from "@tre60/backend";
import { getAdminSupabaseEnv, getSecurityEnv } from "@tre60/config";

type ConsumeBody = {
  handoff?: string;
  app?: string;
};

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const securityEnv = getSecurityEnv();
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized();
  }

  const providedSecret = authHeader.slice("Bearer ".length);

  if (providedSecret !== securityEnv.authHandoffSharedSecret) {
    return unauthorized();
  }

  const body = (await request.json()) as ConsumeBody;
  const targetApp = body.app === "portal" ? "portal" : body.app === "intra" ? "intra" : null;
  const parsed = body.handoff ? splitHandoffToken(body.handoff) : null;

  if (!targetApp || !parsed) {
    return NextResponse.json({ error: "invalid_handoff" }, { status: 400 });
  }

  const admin = createTre60AdminClient(getAdminSupabaseEnv()) as any;
  const { data: row, error } = await admin
    .from("auth_handoffs")
    .select("*")
    .eq("id", parsed.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "invalid_handoff" }, { status: 404 });
  }

  if (row.target_app !== targetApp || row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "invalid_handoff" }, { status: 410 });
  }

  if (!safeEqualHexHash(row.secret_hash, hashHandoffSecret(parsed.secret))) {
    return NextResponse.json({ error: "invalid_handoff" }, { status: 401 });
  }

  const { data: updatedRows, error: consumeError } = await admin
    .from("auth_handoffs")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id");

  if (consumeError || !updatedRows?.length) {
    return NextResponse.json({ error: "handoff_already_consumed" }, { status: 409 });
  }

  const session = decryptSessionPayload(
    {
      ciphertext: row.payload_ciphertext,
      iv: row.payload_iv,
      authTag: row.payload_auth_tag
    },
    securityEnv.authHandoffEncryptionKey
  );

  return NextResponse.json({
    userId: row.user_id,
    role: row.role,
    next: row.redirect_path,
    session
  });
}
