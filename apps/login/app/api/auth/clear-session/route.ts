import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function shouldClearCookie(name: string): boolean {
  return (
    name.startsWith("sb-") ||
    name.includes("supabase") ||
    name.includes("auth-token")
  );
}

export async function POST() {
  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });

  for (const cookie of cookieStore.getAll()) {
    if (!shouldClearCookie(cookie.name)) {
      continue;
    }

    response.cookies.set(cookie.name, "", {
      path: "/",
      expires: new Date(0),
      maxAge: 0
    });
  }

  return response;
}
