"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnswerRecord, Attempt, Course, Question } from "@/lib/types";
import { getCourse, saveAttempt } from "@/lib/storage";
import { pickN, shuffle, uid } from "@/lib/shuffle";

const QUIZ_SIZE = 30;
const QUIZ_MS = 15 * 60 * 1000;

interface DisplayQuestion extends Question {
  displayOptions: string[];
  displayCorrectIndex: number;
  displayToOriginal: number[];
}

function prepare(qs: Question[]): DisplayQuestion[] {
  const chosen = pickN(qs, QUIZ_SIZE);
  return chosen.map((q) => {
    const indices = shuffle(q.options.map((_, i) => i));
    return {
      ...q,
      displayOptions: indices.map((i) => q.options[i]),
      displayCorrectIndex: indices.indexOf(q.correctIndex),
      displayToOriginal: indices,
    };
  });
}

export default function QuizPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [items, setItems] = useState<DisplayQuestion[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [startedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const [showPalette, setShowPalette] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    const c = getCourse(params.courseId);
    setCourse(c ?? null);
    if (c) {
      if (c.questions.length === 0) {
        setItems([]);
      } else {
        setItems(prepare(c.questions));
      }
    }
  }, [params.courseId]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  const remainingMs = Math.max(0, QUIZ_MS - (now - startedAt));
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");

  const total = items?.length ?? 0;
  const answered = Object.keys(choices).length;
  const q = items && items[current];

  const submit = useCallback(() => {
    if (submittedRef.current || !items || !course) return;
    submittedRef.current = true;
    const finishedAt = Date.now();
    const answers: AnswerRecord[] = items.map((item) => {
      const displayChoice = choices[item.id];
      const chosenIndex =
        displayChoice === undefined ? null : item.displayToOriginal[displayChoice];
      const correct = chosenIndex !== null && chosenIndex === item.correctIndex;
      return { questionId: item.id, chosenIndex, correct, timeMs: 0 };
    });
    const attempt: Attempt = {
      id: uid("att"),
      courseId: course.id,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      questionIds: items.map((i) => i.id),
      answers,
      score: answers.filter((a) => a.correct).length,
      total: items.length,
    };
    saveAttempt(attempt);
    router.push(`/courses/${course.id}/results/${attempt.id}`);
  }, [items, course, choices, startedAt, router]);

  useEffect(() => {
    if (remainingMs === 0 && items && items.length > 0) submit();
  }, [remainingMs, items, submit]);

  // Keyboard shortcuts: 1-4 select, ← → navigate, Enter next, Esc palette
  useEffect(() => {
    if (!q) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key >= "1" && e.key <= "9") {
        const i = Number(e.key) - 1;
        if (i < q.displayOptions.length) {
          setChoices((prev) => ({ ...prev, [q.id]: i }));
          e.preventDefault();
        }
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        setCurrent((c) => Math.min(total - 1, c + 1));
      } else if (e.key === "ArrowLeft") {
        setCurrent((c) => Math.max(0, c - 1));
      } else if (e.key.toLowerCase() === "q") {
        setShowPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, total]);

  if (course === undefined || items === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-white/50">Preparing your test…</div>
      </div>
    );
  }
  if (course === null) return <p className="text-rose-300">Course not found.</p>;

  if (items.length === 0) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="text-xl font-semibold">No questions yet</h1>
        <p className="mt-2 text-sm text-white/60">This course doesn't have any questions to practice with.</p>
        <Link href={`/courses/${course.id}`} className="btn-ghost mt-4 inline-flex">
          Back to course
        </Link>
      </div>
    );
  }

  if (!q) return null;

  const chosen = choices[q.id];
  const low = remainingSec <= 60;
  const progressPct = ((current + 1) / total) * 100;
  const answeredPct = (answered / total) * 100;

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-20">
      {/* Sticky header / timer */}
      <div className="sticky top-0 z-30 -mx-4 bg-[#0a0718]/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs uppercase tracking-wider text-white/40">{course.name}</p>
              <p className="text-sm text-white/80">
                Question <span className="font-semibold text-white">{current + 1}</span>
                <span className="text-white/40"> / {total}</span>
                <span className="ml-3 text-white/40">· {answered} answered</span>
              </p>
            </div>
            <Timer mm={mm} ss={ss} low={low} />
          </div>
          {/* Dual progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-white/15 transition-[width] duration-300 ease-out"
              style={{ width: `${answeredPct}%` }}
            />
            <div
              className="-mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-brand-500 via-purple-500 to-fuchsia-500 transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="mx-auto mt-8 max-w-3xl">
        <div key={q.id} className="animate-scale-in">
          <div className="card sm:p-8">
            <div className="flex items-center justify-between">
              <span className="pill border-brand-400/30 bg-brand-500/10 text-brand-200">{q.topic}</span>
              <span className="text-xs text-white/40">Tip: press 1–{q.displayOptions.length} to answer</span>
            </div>
            <h2 className="mt-5 text-xl font-medium leading-relaxed sm:text-2xl">{q.question}</h2>

            <ul className="mt-6 space-y-2.5">
              {q.displayOptions.map((opt, i) => {
                const active = chosen === i;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setChoices((prev) => ({ ...prev, [q.id]: i }))}
                      className={`group relative flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all duration-200 sm:text-base ${
                        active
                          ? "border-transparent bg-gradient-to-r from-brand-500/20 via-purple-500/15 to-fuchsia-500/15 shadow-glow"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-xl border border-brand-400/60"
                        />
                      )}
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition ${
                          active
                            ? "bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-glow"
                            : "bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white/80"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className={active ? "text-white" : "text-white/80"}>{opt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Navigation */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              ← Previous
            </button>

            <button
              type="button"
              onClick={() => setShowPalette((v) => !v)}
              className="btn-ghost btn-sm hidden sm:inline-flex"
              title="Toggle question map (Q)"
            >
              {showPalette ? "Hide map" : "Question map"}
            </button>

            {current < total - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (confirm(`Submit now? ${answered}/${total} answered.`)) submit();
                }}
              >
                Submit test ✓
              </button>
            )}
          </div>

          {/* Question palette */}
          {showPalette && (
            <div className="card mt-5 animate-fade-in">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">Jump to question</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((it, idx) => {
                  const answeredThis = choices[it.id] !== undefined;
                  const isCurrent = idx === current;
                  return (
                    <button
                      key={it.id}
                      onClick={() => setCurrent(idx)}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                        isCurrent
                          ? "bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-glow"
                          : answeredThis
                          ? "bg-brand-500/20 text-brand-200 hover:bg-brand-500/30"
                          : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/40">
                <LegendDot className="bg-gradient-to-br from-brand-500 to-fuchsia-500" label="Current" />
                <LegendDot className="bg-brand-500/30" label="Answered" />
                <LegendDot className="bg-white/10" label="Unseen" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Timer({ mm, ss, low }: { mm: string; ss: string; low: boolean }) {
  return (
    <div
      className={`relative flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-lg tabular-nums transition ${
        low
          ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
          : "border-white/10 bg-white/[0.04] text-white"
      }`}
    >
      {low && <span className="absolute -inset-px animate-pulse rounded-xl border border-rose-400/40" />}
      <span className={`h-1.5 w-1.5 rounded-full ${low ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`} />
      {mm}:{ss}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}
