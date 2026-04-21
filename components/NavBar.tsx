"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/useRole";

export default function NavBar() {
  const { role, ready, logout } = useRole();
  const pathname = usePathname();
  const onQuiz = pathname?.includes("/quiz");

  if (onQuiz) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0718]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 via-purple-500 to-fuchsia-500 text-sm font-bold text-white shadow-glow">
            U
            <span className="absolute -inset-0.5 rounded-lg bg-gradient-to-br from-brand-500 to-fuchsia-500 opacity-40 blur" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Univa<span className="text-white/40"> · Practice</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {ready && role === "admin" ? (
            <>
              <span className="hidden sm:inline pill border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Admin
              </span>
              <Link href="/courses/new" className="btn-primary btn-sm">
                + New course
              </Link>
              <button onClick={logout} className="btn-ghost btn-sm">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-ghost btn-sm">
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
