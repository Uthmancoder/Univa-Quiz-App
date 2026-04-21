"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Attempt, Course } from "@/lib/types";
import { deleteCourse, listAttempts, listCourses } from "@/lib/storage";
import { useRole } from "@/lib/useRole";

export default function HomePage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const { role, ready } = useRole();
  const isAdmin = role === "admin";

  useEffect(() => {
    setCourses(listCourses());
    setAttempts(listAttempts());
  }, []);

  const bestByCourse = useMemo(() => {
    const m = new Map<string, { best: number; count: number }>();
    for (const a of attempts) {
      const pct = Math.round((a.score / a.total) * 100);
      const cur = m.get(a.courseId) ?? { best: 0, count: 0 };
      m.set(a.courseId, { best: Math.max(cur.best, pct), count: cur.count + 1 });
    }
    return m;
  }, [attempts]);

  const onDelete = (id: string, name: string) => {
    if (!confirm(`Delete course "${name}"? All its attempts will be removed.`)) return;
    deleteCourse(id);
    setCourses(listCourses());
  };

  if (courses === null || !ready) {
    return <LoadingShimmer />;
  }

  const totalQuestions = courses.reduce((n, c) => n + c.questions.length, 0);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-xl sm:p-10">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl animate-blob-drift" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl animate-blob-drift-slow" />
        <div className="relative">
          <span className="pill border-brand-400/30 bg-brand-500/10 text-brand-200">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
            {isAdmin ? "Admin dashboard" : "Learning mode"}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            {isAdmin ? (
              <>Manage your <span className="text-gradient">practice library</span>.</>
            ) : (
              <>Practice smarter. <span className="text-gradient">Remember longer.</span></>
            )}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            {isAdmin
              ? "Upload notes, create courses, and let Claude turn them into question banks students can drill."
              : "Pick a course, take a fresh 15-minute test, and review every mistake with explanations."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {courses.length > 0 && (
              <Link href={`/courses/${courses[0].id}/quiz`} className="btn-primary">
                Start practicing →
              </Link>
            )}
            {isAdmin && (
              <Link href="/courses/new" className="btn-ghost">
                + New course
              </Link>
            )}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-md">
            <StatChip label="Courses" value={courses.length} />
            <StatChip label="Questions" value={totalQuestions} />
            <StatChip label="Attempts" value={attempts.length} />
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isAdmin ? "All courses" : "Your courses"}
            </h2>
            <p className="text-sm text-white/50">
              {courses.length === 0
                ? "Nothing here yet."
                : `${courses.length} ${courses.length === 1 ? "course" : "courses"} available to practice`}
            </p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="card text-center py-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">
              {isAdmin ? "📚" : "⌛"}
            </div>
            <p className="mt-4 text-white/70">
              {isAdmin ? "No courses yet — create the first one." : "No courses available yet. Check back soon."}
            </p>
            {isAdmin && (
              <Link href="/courses/new" className="btn-primary mt-5 inline-flex">
                Create your first course
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c, idx) => {
              const stats = bestByCourse.get(c.id);
              return (
                <li
                  key={c.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
                >
                  <CourseCard
                    course={c}
                    best={stats?.best ?? null}
                    attempts={stats?.count ?? 0}
                    isAdmin={isAdmin}
                    onDelete={onDelete}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="pt-6 text-center text-xs text-white/30">
        Your progress is saved locally on this device.
      </p>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
    </div>
  );
}

function CourseCard({
  course,
  best,
  attempts,
  isAdmin,
  onDelete,
}: {
  course: Course;
  best: number | null;
  attempts: number;
  isAdmin: boolean;
  onDelete: (id: string, name: string) => void;
}) {
  const canPractice = course.questions.length > 0;
  const bestColor =
    best === null ? "text-white/40" : best >= 70 ? "text-emerald-300" : best >= 50 ? "text-amber-300" : "text-rose-300";
  return (
    <div className="group card-hover flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/courses/${course.id}`}
          className="flex-1 text-base font-semibold tracking-tight transition group-hover:text-white"
        >
          {course.name}
        </Link>
        <span className="pill shrink-0">{course.questions.length} Qs</span>
      </div>

      {course.description && (
        <p className="text-sm text-white/55 line-clamp-2">{course.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/5 pt-4">
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span>
            Best: <span className={`font-semibold ${bestColor}`}>{best === null ? "—" : `${best}%`}</span>
          </span>
          <span>
            Tries: <span className="font-semibold text-white/70">{attempts}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={canPractice ? `/courses/${course.id}/quiz` : `/courses/${course.id}`}
          className={canPractice ? "btn-primary btn-sm flex-1" : "btn-ghost btn-sm flex-1 cursor-not-allowed opacity-70"}
        >
          {canPractice ? "Practice →" : "No questions"}
        </Link>
        <Link href={`/courses/${course.id}`} className="btn-ghost btn-sm">
          Details
        </Link>
        {isAdmin && (
          <>
            <Link
              href={`/courses/${course.id}/edit`}
              className="btn-ghost btn-sm"
              title="Edit course"
            >
              Edit
            </Link>
            <button
              onClick={() => onDelete(course.id, course.name)}
              className="btn-ghost btn-sm !text-rose-300 hover:!bg-rose-500/15 hover:!border-rose-400/30"
              title="Delete course"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingShimmer() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-52 rounded-3xl bg-white/[0.03] border border-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-white/[0.03] border border-white/5" />
        ))}
      </div>
    </div>
  );
}
