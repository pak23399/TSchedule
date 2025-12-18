"use client";

export function LogoutButton() {
  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <button
      onClick={onLogout}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: "1px solid #ccc",
        cursor: "pointer",
      }}
    >
      Logout
    </button>
  );
}
