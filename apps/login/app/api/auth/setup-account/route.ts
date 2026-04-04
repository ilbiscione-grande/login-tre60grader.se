import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSupabaseCookieAdapter,
  createTre60AdminClient,
  createTre60ServerClient
} from "@tre60/backend";
import { getAdminSupabaseEnv, getServerSupabaseEnv } from "@tre60/config";

type Body = {
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const password = body.password ?? "";

  if (password.length < 8) {
    return NextResponse.json(
      { error: "invalid_password", message: "Lösenordet måste vara minst 8 tecken." },
      { status: 400 }
    );
  }

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
  const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, {
    password
  });

  if (passwordError) {
    return NextResponse.json(
      {
        error: "password_update_failed",
        message: passwordError.message ?? "Det gick inte att spara lösenordet."
      },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("profiles")
    .update({ status: "active" })
    .eq("id", user.id)
    .eq("status", "invited");

  if (error) {
    return NextResponse.json(
      { error: "activate_failed", message: "Lösenordet sparades, men kontot kunde inte aktiveras." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
