import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSupabaseCookieAdapter,
  createTre60AdminClient,
  createTre60ServerClient
} from "@tre60/backend";
import { getAdminSupabaseEnv, getServerSupabaseEnv } from "@tre60/config";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createTre60ServerClient(
    getServerSupabaseEnv(),
    createSupabaseCookieAdapter(cookieStore)
  );
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "missing_session" }, { status: 401 });
  }

  const admin = createTre60AdminClient(getAdminSupabaseEnv()) as any;
  const { error } = await admin
    .from("profiles")
    .update({ status: "active" })
    .eq("id", user.id)
    .eq("status", "invited");

  if (error) {
    return NextResponse.json({ error: "activate_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
