import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // cho phép các route public
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // đọc JWT cookie
  const token = req.cookies.get("dacn_token")?.value;

  // chưa login → redirect login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
      áp dụng cho tất cả route
      trừ _next, static, favicon
    */
    "/((?!_next|favicon.ico|assets|images).*)",
  ],
};
