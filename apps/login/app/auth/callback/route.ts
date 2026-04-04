import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient
} from "@tre60/backend";
import { getServerSupabaseEnv } from "@tre60/config";

function isSupportedEmailOtpType(value: string | null): value is "magiclink" | "recovery" | "invite" | "email" | "email_change" {
  return (
    value === "magiclink" ||
    value === "recovery" ||
    value === "invite" ||
    value === "email" ||
    value === "email_change"
  );
}

function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  if (value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL("/auth/error?code=missing_code", url.origin));
  }

  const cookieStore = await cookies();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );

  if (tokenHash) {
    if (!isSupportedEmailOtpType(type)) {
      return NextResponse.redirect(new URL("/auth/error?code=missing_code", url.origin));
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    });

    if (error) {
      return NextResponse.redirect(new URL("/auth/error?code=otp_verification_failed", url.origin));
    }

    return NextResponse.redirect(new URL(next, url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code!);

  if (error) {
    return NextResponse.redirect(new URL("/auth/error?code=callback_exchange_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
