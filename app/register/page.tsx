"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./register.module.css";
export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [timeZone, setTimeZone] = useState("Asia/Ho_Chi_Minh");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (password !== confirm) {
      setErr("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, timeZone, password }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErr(data?.error || "Register failed");
        return;
      }

      // cookie httpOnly đã được set ở route.ts
      router.push("/"); // hoặc "/schedule"
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
   <div className={styles.pageRoot}>
    <section className={styles.section}>
      {/* background decorative image */}
      <img
        className={styles.bgEclipse}
        src="/images/sign-up-eclipse-light-green.png"
        alt=""
        aria-hidden
      />

      <div className={styles.container}>
        {/* logo */}
        {/* <div className={styles.logoWrap}>
          <a className={styles.logoLink} href="/">
            <img
              className={styles.logo}
              src="/images/brand.svg"
              alt="Brand logo"
            />
          </a>
        </div> */}

        {/* form card */}
        <div className={styles.card}>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Sign up to start using the timetable ✨</p>

          {err && <div className={styles.error}>{err}</div>}

          <form onSubmit={onSubmit} className={styles.form}>
            <label className={styles.label}>
              <span>Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
                className={styles.input}
              />
            </label>

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
              <span>Time zone</span>
              <input
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                placeholder="Asia/Ho_Chi_Minh"
                className={styles.input}
              />
              <small className={styles.hint}>
                Backend của bạn đang nhận field <code>TimeZone</code>.
              </small>
            </label>

            <label className={styles.label}>
              <span>Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className={styles.input}
              />
            </label>

            <label className={styles.label}>
              <span>Confirm password</span>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                required
                className={styles.input}
              />
            </label>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        {/* bottom link */}
        <div className={styles.bottomText}>
          <p>
            <span className={styles.muted}>Already have an account? </span>
            <a className={styles.link} href="/login">
              Login
            </a>
          </p>
        </div>
      </div>
    </section>
  </div>
);
}
