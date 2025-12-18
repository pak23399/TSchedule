import { NextResponse } from "next/server";

export async function POST() {
  const cookieName = process.env.JWT_COOKIE_NAME || "dacn_token";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
