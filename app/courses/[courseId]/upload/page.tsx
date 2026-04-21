"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Course, Question } from "@/lib/types";
import { addQuestions, getCourse } from "@/lib/storage";
import { uid } from "@/lib/shuffle";
import { useRole } from "@/lib/useRole";

export default function UploadPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { role, ready } = useRole();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState(25);
  const [topicHint, setTopicHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);

  useEffect(() => {
    if (ready && role !== "admin") router.replace("/login");
  }, [ready, role, router]);

  useEffect(() => {
    setCourse(getCourse(params.courseId));
  }, [params.courseId]);

  if (!ready || role !== "admin") {
    return <p className="text-white/50">Checking access…</p>;
  }

  const onFile = async (f: File) => {
    if (!f) return;
    if (f.size > 1_500_000) {
      setError("File is too large. Please keep notes under ~1.5 MB of text.");
      return;
    }
    const text = await f.text();
    setNotes(text);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdded(null);
    if (notes.trim().length < 80) {
      setError("Please paste or upload more substantial notes (≥ 80 characters).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, count, topicHint: topicHint || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate");
      type ModelQ = { topic: string; question: string; options: string[]; correctIndex: number; explanation: string };
      const newQs: Question[] = (data.questions as ModelQ[]).map((q) => ({
        id: uid("q"),
        type: "mcq",
        topic: q.topic,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      }));
      const updated = addQuestions(params.courseId, newQs);
      if (!updated) throw new Error("Course no longer exists");
      setCourse(updated);
      setAdded(newQs.length);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (course === undefined) return <p className="text-white/50">Loading…</p>;
  if (course === null) return <p className="text-rose-300">Course not found.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <Link href={`/courses/${course.id}`} className="text-sm text-white/50 hover:text-white transition">
          ← {course.name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Add more notes</h1>
        <p className="mt-1 text-sm text-white/50">
          Current bank: <span className="text-white/80">{course.questions.length} questions</span>. New questions
          will be appended and sampled randomly in future tests.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-5">
        <div>
          <label className="label">Upload a .txt / .md file</label>
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(e) => e.target.files && onFile(e.target.files[0])}
            className="block w-full text-sm text-white/70 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-white/15"
          />
        </div>
        <div>
          <label className="label">Or paste notes</label>
          <textarea
            className="input min-h-[280px] font-mono text-[13px] leading-relaxed"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your study notes here…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Topic hint (optional)</label>
            <input
              className="input"
              value={topicHint}
              onChange={(e) => setTopicHint(e.target.value)}
              placeholder="e.g. Photosynthesis"
            />
          </div>
          <div>
            <label className="label">Questions to generate</label>
            <input
              type="number"
              min={5}
              max={40}
              className="input w-32"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Generating…" : "Generate questions"}
          </button>
          {added !== null && (
            <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300">
              Added {added} new questions ✓
            </p>
          )}
        </div>
        {error && (
          <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
