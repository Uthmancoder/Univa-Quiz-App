"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Attempt, Course } from "@/lib/types";
import { getAttempt, getCourse } from "@/lib/storage";

type Filter = "all" | "missed" | "correct";

export default function ResultsPage() {
  const params = useParams<{ courseId: string; attemptId: string }>();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>("missed");

  useEffect(() => {
    setCourse(getCourse(params.courseId) ?? null);
    setAttempt(getAttempt(params.attemptId) ?? null);
  }, [params.courseId, params.attemptId]);

  const rows = useMemo(() => {
    if (!course || !attempt) return [];
    const qMap = new Map(course.questions.map((q) => [q.id, q]));
    return attempt.answers
      .map((a, idx) => {
        const q = qMap.get(a.questionId);
        return q ? { idx, ...a, q } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => (filter === "all" ? true : filter === "missed" ? !r.correct : r.correct));
  }, [course, attempt, filter]);

  if (course === undefined || attempt === undefined) return <p className="text-white/50">Loading…</p>;
  if (!course) return <p className="text-rose-300">Course not found.</p>;
  if (!attempt) return <p className="text-rose-300">Attempt not found.</p>;

  const pct = Math.round((attempt.score / attempt.total) * 100);
  const secs = Math.round(attempt.durationMs / 1000);
  const missedCount = attempt.answers.filter((a) => !a.correct).length;
  const unanswered = attempt.answers.filter((a) => a.chosenIndex === null).length;
  const ringColor = pct >= 70 ? "stroke-emerald-400" : pct >= 50 ? "stroke-amber-400" : "stroke-rose-400";
  const scoreTone = pct >= 70 ? "text-emerald-300" : pct >= 50 ? "text-amber-300" : "text-rose-300";
  const praise =
    pct >= 90 ? "Outstanding." : pct >= 70 ? "Great work." : pct >= 50 ? "Keep going — you're learning." : "Review the explanations and try again.";

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link href={`/courses/${course.id}`} className="text-sm text-white/50 hover:text-white transition">
          ← {course.name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Results</h1>
        <p className="text-sm text-white/50">{new Date(attempt.finishedAt).toLocaleString()}</p>
      </div>

      {/* Hero score */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 h-60 w-60 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative grid gap-6 sm:grid-cols-[auto,1fr,auto] sm:items-center">
          <ScoreRing pct={pct} ringColor={ringColor} scoreTone={scoreTone} />
          <div>
            <p className="text-sm uppercase tracking-wider text-white/40">Final score</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {attempt.score} <span className="text-white/40">/ {attempt.total}</span>
            </p>
            <p className={`mt-2 text-sm ${scoreTone}`}>{praise}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="pill">⏱ {Math.floor(secs / 60)}m {secs % 60}s</span>
              <span className="pill border-rose-400/30 bg-rose-500/10 text-rose-300">✕ {missedCount} missed</span>
              {unanswered > 0 && (
                <span className="pill border-amber-400/30 bg-amber-500/10 text-amber-300">
                  — {unanswered} blank
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/courses/${course.id}/quiz`} className="btn-primary">
              Retry →
            </Link>
            <Link href={`/courses/${course.id}`} className="btn-ghost">
              Course home
            </Link>
          </div>
        </div>
      </section>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-white/50">Show:</span>
        {(["missed", "correct", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? "bg-gradient-to-r from-brand-500 to-fuchsia-500 text-white shadow-glow"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {f === "missed" ? `Missed (${missedCount})` : f === "correct" ? `Correct (${attempt.score})` : `All (${attempt.total})`}
          </button>
        ))}
      </div>

      {/* Review list */}
      <ul className="space-y-4">
        {rows.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-sm text-white/50">Nothing to show in this view.</p>
          </div>
        )}
        {rows.map((r, idx) => (
          <li key={r.questionId} className="animate-slide-up" style={{ animationDelay: `${Math.min(idx, 6) * 40}ms` }}>
            <ReviewCard r={r} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreRing({ pct, ringColor, scoreTone }: { pct: number; ringColor: string; scoreTone: string }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} className="fill-none stroke-white/10" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className={`fill-none ${ringColor} transition-[stroke-dashoffset] duration-700 ease-out`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold tabular-nums ${scoreTone}`}>{pct}%</span>
      </div>
    </div>
  );
}

function ReviewCard({
  r,
}: {
  r: {
    idx: number;
    questionId: string;
    chosenIndex: number | null;
    correct: boolean;
    q: { topic: string; question: string; options: string[]; correctIndex: number; explanation: string };
  };
}) {
  return (
    <div
      className={`card relative overflow-hidden ${
        r.correct ? "border-l-4 border-l-emerald-400/60" : "border-l-4 border-l-rose-400/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="pill border-brand-400/30 bg-brand-500/10 text-brand-200">{r.q.topic}</span>
        <span
          className={`pill ${
            r.correct
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-400/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {r.correct ? "✓ Correct" : "✕ Incorrect"}
        </span>
      </div>

      <h3 className="mt-4 text-base font-medium leading-relaxed sm:text-lg">
        <span className="mr-2 text-white/40">Q{r.idx + 1}.</span>
        {r.q.question}
      </h3>

      <ul className="mt-4 space-y-2 text-sm">
        {r.q.options.map((opt, i) => {
          const isCorrect = i === r.q.correctIndex;
          const isChosen = r.chosenIndex === i;
          const base = "rounded-xl border px-4 py-3 flex items-start gap-3";
          const style = isCorrect
            ? "border-emerald-400/40 bg-emerald-500/10"
            : isChosen
            ? "border-rose-400/40 bg-rose-500/10"
            : "border-white/10 bg-white/[0.02]";
          return (
            <li key={i} className={`${base} ${style}`}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isCorrect
                    ? "bg-emerald-400/20 text-emerald-200"
                    : isChosen
                    ? "bg-rose-400/20 text-rose-200"
                    : "bg-white/5 text-white/50"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 text-white/85">{opt}</span>
              {isCorrect && <span className="text-xs font-semibold text-emerald-300">Correct</span>}
              {isChosen && !isCorrect && <span className="text-xs font-semibold text-rose-300">Your answer</span>}
            </li>
          );
        })}
        {r.chosenIndex === null && (
          <li className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-xs italic text-amber-200">
            You didn't answer this question.
          </li>
        )}
      </ul>

      {r.q.explanation && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">Why</p>
          <p className="mt-1 text-sm leading-relaxed text-white/80">{r.q.explanation}</p>
        </div>
      )}
    </div>
  );
}
