import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/verify-session";

const SESSION = "__session";
const ROLE = "placeiq_role";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = typeof body?.idToken === "string" ? body.idToken : "";
    const role =
      body?.role === "tpc" || body?.role === "student" ? body.role : undefined;
    if (!idToken) {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }
    await verifyFirebaseIdToken(idToken);
    const jar = await cookies();
    jar.set(SESSION, idToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 5,
    });
    if (role) {
      jar.set(ROLE, role, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 5,
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION);
  jar.delete(ROLE);
  return NextResponse.json({ ok: true });
}
