"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Course } from "@/lib/types";
import { saveCourse } from "@/lib/storage";
import { uid } from "@/lib/shuffle";
import { useRole } from "@/lib/useRole";

export default function NewCoursePage() {
  const router = useRouter();
  const { role, ready } = useRole();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && role !== "admin") router.replace("/login");
  }, [ready, role, router]);

  if (!ready || role !== "admin") {
    return <p className="text-white/50">Checking access…</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please give the course a name.");
    setBusy(true);

    const now = Date.now();
    const course: Course = {
      id: uid("course"),
      name: name.trim(),
      description: description.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      questions: [],
    };

    if (notes.trim().length >= 80) {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, count }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to generate");
        type ModelQ = { topic: string; question: string; options: string[]; correctIndex: number; explanation: string };
        course.questions = (data.questions as ModelQ[]).map((q) => ({
          id: uid("q"),
          type: "mcq" as const,
          topic: q.topic,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        }));
      } catch (err) {
        setBusy(false);
        setError(err instanceof Error ? err.message : "Generation failed");
        return;
      }
    }

    saveCourse(course);
    router.push(`/courses/${course.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <Link href="/" className="text-sm text-white/50 hover:text-white transition">← All courses</Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create a new course</h1>
        <p className="mt-1 text-sm text-white/50">
          Name it, paste notes, and we'll auto-generate the first batch of questions.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-5">
        <div>
          <label className="label">Course name</label>
          <input className="input-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BIO 101 — Cell Biology" />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
        </div>
        <div>
          <label className="label">Paste notes (optional)</label>
          <textarea
            className="input min-h-[240px] font-mono text-[13px] leading-relaxed"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your lecture notes here…"
          />
          <p className="mt-1.5 text-xs text-white/40">Leave empty to start with no questions — you can add notes later.</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Questions to generate</label>
            <input
              type="number"
              min={5}
              max={40}
              className="input w-28"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Creating…" : "Create course"}
          </button>
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
