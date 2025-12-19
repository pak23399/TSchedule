"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      setErr("Missing NEXT_PUBLIC_API_URL in .env.local");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErr(data?.message || data?.error || "Login failed");
        return;
      }

      // Backend .NET của bạn trả field "Token" (T hoa)
      const token = data?.token ?? data?.token;
      if (!token) {
        setErr("Login succeeded but token is missing in response.");
        return;
      }

      // ✅ Lưu token để eventsAPI.ts gắn Authorization: Bearer ...
      localStorage.setItem("accessToken", token);

      router.push("/"); // hoặc "/schedule"
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
   <div className={styles.page}>
    {/* background */}
    <div className={styles.bg} aria-hidden />

    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Đăng nhập</h1>
        <p className={styles.subTitle}>Chào mừng bạn quay lại 👋</p>

        {err && <div className={styles.error}>{err}</div>}

        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label}>
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
              required
              className={styles.input}
            />
          </label>

          <label className={styles.label}>
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              required
              className={styles.input}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <div className={styles.footer}>
            Chưa có tài khoản?{" "}
            <a href="/register" className={styles.link}>
              Đăng ký
            </a>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
