"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // các trang không cần login
    const publicPaths = ["/login", "/register"];
    if (publicPaths.includes(pathname)) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
