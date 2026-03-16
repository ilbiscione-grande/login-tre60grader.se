import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient
} from "@tre60/backend";
import { getServerSupabaseEnv } from "@tre60/config";

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
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/error?code=missing_code", url.origin));
  }

  const cookieStore = await cookies();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/error?code=callback_exchange_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
