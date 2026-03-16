import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSupabaseCookieAdapter,
  createTre60ServerClient
} from "@tre60/backend";
import { getServerSupabaseEnv } from "@tre60/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", url.origin));
}
