"use client";
import { useEffect, useState } from "react";

export type Role = "admin" | "student";

export function useRole(): { role: Role; ready: boolean; logout: () => void } {
  const [role, setRole] = useState<Role>("student");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("userRole") : null;
    setRole(stored === "admin" ? "admin" : "student");
    setReady(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "userRole") setRole(e.newValue === "admin" ? "admin" : "student");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = () => {
    window.localStorage.removeItem("userRole");
    setRole("student");
  };

  return { role, ready, logout };
}
