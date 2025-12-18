import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json(); // { email, password }
  const base = process.env.DOTNET_API_BASE_URL!;
  const cookieName = process.env.JWT_COOKIE_NAME || "dacn_token";

  const r = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await r.json().catch(() => null);

  if (!r.ok) {
    return NextResponse.json(
      { error: data?.message ?? "Login failed" },
      { status: r.status }
    );
  }

  // backend trả { token, expiresAt, userId, ... }
  const token = data?.token;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 500 });
  }

  const res = NextResponse.json(
    { user: { userId: data.userId, email: data.email, fullName: data.fullName }, expiresAt: data.expiresAt },
    { status: 200 }
  );

  // httpOnly cookie
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // localhost; production => true (https)
    path: "/",
  });

  return res;
}
