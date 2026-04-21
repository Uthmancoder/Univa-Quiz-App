"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setTimeout(() => {
      if (username === "admin@univa.com" && password === "univaAdmin") {
        localStorage.setItem("userRole", "admin");
        router.push("/");
      } else {
        setError("Invalid credentials");
        setBusy(false);
      }
    }, 300);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center animate-fade-in">
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-10 -z-10 bg-gradient-to-br from-brand-500/20 via-fuchsia-500/10 to-transparent blur-3xl" />
        <div className="card">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-xl font-bold shadow-glow">
              U
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Admin sign in</h1>
            <p className="mt-1 text-sm text-white/50">
              Only admins upload notes and manage courses.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-lg"
                placeholder="admin@univa.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-lg"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            <Link href="/" className="hover:text-white transition">
              ← Back to practice
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
