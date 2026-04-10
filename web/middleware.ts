import { NextResponse, type NextRequest } from "next/server";
import * as jose from "jose";

const JWKS = jose.createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

async function verifyToken(token: string): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return false;
  try {
    await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("__session")?.value;
  const roleCookie = request.cookies.get("placeiq_role")?.value;

  const isStudent = pathname.startsWith("/student");
  const isTpc = pathname.startsWith("/tpc");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const sessionValid = session ? await verifyToken(session) : false;

  if (isStudent || isTpc) {
    if (!sessionValid) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (isAuthPage && sessionValid) {
    const url = request.nextUrl.clone();
    url.pathname = roleCookie === "tpc" ? "/tpc/dashboard" : "/student/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/tpc/:path*", "/login", "/register"],
};
