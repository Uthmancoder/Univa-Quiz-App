"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Attempt, Course } from "@/lib/types";
import { getCourse, listAttempts } from "@/lib/storage";
import { useRole } from "@/lib/useRole";

export default function CoursePage() {
  const params = useParams<{ courseId: string }>();
  const { role, ready } = useRole();
  const isAdmin = role === "admin";
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    setCourse(getCourse(params.courseId));
    setAttempts(listAttempts(params.courseId));
  }, [params.courseId]);

  const topicCounts = useMemo(() => {
    if (!course) return [] as Array<{ topic: string; count: number }>;
    const map = new Map<string, number>();
    for (const q of course.questions) map.set(q.topic, (map.get(q.topic) || 0) + 1);
    return Array.from(map, ([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count);
  }, [course]);

  if (course === undefined || !ready) return <p className="text-white/50">Loading…</p>;
  if (course === null) return <p className="text-rose-300">Course not found.</p>;

  const bestScore = attempts.length
    ? Math.max(...attempts.map((a) => Math.round((a.score / a.total) * 100)))
    : null;
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((n, a) => n + (a.score / a.total) * 100, 0) / attempts.length)
    : null;
  const canPractice = course.questions.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link href="/" className="text-sm text-white/50 hover:text-white transition">← All courses</Link>
      </div>

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="pill">{course.questions.length} questions in bank</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{course.name}</h1>
            {course.description && (
              <p className="mt-2 text-sm text-white/60 sm:text-base">{course.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canPractice ? (
              <Link href={`/courses/${course.id}/quiz`} className="btn-primary">
                Start test → <span className="text-white/70">15 min · 30 Qs</span>
              </Link>
            ) : (
              <span className="btn-ghost cursor-not-allowed opacity-70">No questions yet</span>
            )}
            {isAdmin && (
              <>
                <Link href={`/courses/${course.id}/edit`} className="btn-ghost">
                  Edit
                </Link>
                <Link href={`/courses/${course.id}/upload`} className="btn-ghost">
                  + Add notes
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Question bank" value={course.questions.length} tone="neutral" />
        <StatCard label="Your attempts" value={attempts.length} tone="neutral" />
        <StatCard label="Best score" value={bestScore === null ? "—" : `${bestScore}%`} tone={bestScore === null ? "neutral" : bestScore >= 70 ? "good" : bestScore >= 50 ? "warn" : "bad"} />
        <StatCard label="Average" value={avgScore === null ? "—" : `${avgScore}%`} tone={avgScore === null ? "neutral" : avgScore >= 70 ? "good" : avgScore >= 50 ? "warn" : "bad"} />
      </div>

      {topicCounts.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Topics covered</h2>
          <ul className="flex flex-wrap gap-2">
            {topicCounts.map((t) => (
              <li key={t.topic} className="pill">
                {t.topic}
                <span className="text-white/40">· {t.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Past attempts</h2>
          {attempts.length > 0 && canPractice && (
            <Link href={`/courses/${course.id}/quiz`} className="btn-ghost btn-sm">
              Retry →
            </Link>
          )}
        </div>
        {attempts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-white/50">No attempts yet.</p>
            {canPractice && (
              <Link href={`/courses/${course.id}/quiz`} className="btn-primary mt-4 inline-flex">
                Take your first test
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {attempts.map((a) => {
              const pct = Math.round((a.score / a.total) * 100);
              const color = pct >= 70 ? "text-emerald-300" : pct >= 50 ? "text-amber-300" : "text-rose-300";
              return (
                <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{new Date(a.finishedAt).toLocaleString()}</p>
                    <p className="text-white/50 text-xs">
                      {a.score} / {a.total} · {Math.round(a.durationMs / 1000)}s
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-semibold ${color}`}>{pct}%</span>
                    <Link href={`/courses/${course.id}/results/${a.id}`} className="btn-ghost btn-sm">
                      Review
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const color =
    tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : tone === "bad" ? "text-rose-300" : "text-white";
  return (
    <div className="card">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
