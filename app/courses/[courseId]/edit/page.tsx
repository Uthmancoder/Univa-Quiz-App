"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Course, Question } from "@/lib/types";
import {
  deleteCourse,
  deleteQuestion,
  getCourse,
  updateCourseMeta,
  updateQuestion,
} from "@/lib/storage";
import { useRole } from "@/lib/useRole";

export default function EditCoursePage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { role, ready } = useRole();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savedTick, setSavedTick] = useState(0);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (ready && role !== "admin") router.replace("/login");
  }, [ready, role, router]);

  useEffect(() => {
    const c = getCourse(params.courseId);
    setCourse(c ?? null);
    if (c) {
      setName(c.name);
      setDescription(c.description ?? "");
    }
  }, [params.courseId]);

  const visibleQuestions = useMemo(() => {
    if (!course) return [];
    const f = filter.trim().toLowerCase();
    if (!f) return course.questions;
    return course.questions.filter(
      (q) =>
        q.question.toLowerCase().includes(f) ||
        q.topic.toLowerCase().includes(f) ||
        q.options.some((o) => o.toLowerCase().includes(f))
    );
  }, [course, filter]);

  if (!ready || role !== "admin") return <p className="text-white/50">Checking access…</p>;
  if (course === undefined) return <p className="text-white/50">Loading…</p>;
  if (course === null) return <p className="text-rose-300">Course not found.</p>;

  const saveMeta = () => {
    if (!name.trim()) return alert("Course name can't be empty.");
    const updated = updateCourseMeta(course.id, { name: name.trim(), description: description.trim() });
    if (updated) {
      setCourse(updated);
      setSavedTick((t) => t + 1);
    }
  };

  const onSaveQuestion = (q: Question) => {
    const updated = updateQuestion(course.id, q);
    if (updated) {
      setCourse(updated);
      setEditingId(null);
    }
  };

  const onDeleteQuestion = (q: Question) => {
    if (!confirm(`Delete this question?\n\n"${q.question.slice(0, 120)}${q.question.length > 120 ? "…" : ""}"`))
      return;
    const updated = deleteQuestion(course.id, q.id);
    if (updated) setCourse(updated);
  };

  const onDeleteCourse = () => {
    if (!confirm(`Delete course "${course.name}"? All its attempts will be removed. This cannot be undone.`))
      return;
    deleteCourse(course.id);
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div>
        <Link href={`/courses/${course.id}`} className="text-sm text-white/50 hover:text-white transition">
          ← {course.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Edit course</h1>
            <p className="mt-1 text-sm text-white/50">
              Update details, edit or remove questions, or add more notes to grow the bank.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/courses/${course.id}/upload`} className="btn-ghost">
              + Add notes
            </Link>
            <button onClick={onDeleteCourse} className="btn-danger">
              Delete course
            </button>
          </div>
        </div>
      </div>

      {/* Meta */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Course details</h2>
          {savedTick > 0 && (
            <span
              key={savedTick}
              className="pill border-emerald-400/30 bg-emerald-500/10 text-emerald-300 animate-fade-in"
            >
              ✓ Saved
            </span>
          )}
        </div>
        <div>
          <label className="label">Name</label>
          <input className="input-lg" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
          />
        </div>
        <div>
          <button onClick={saveMeta} className="btn-primary">
            Save changes
          </button>
        </div>
      </section>

      {/* Questions */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Questions · {course.questions.length}
            </h2>
            <p className="text-xs text-white/40">Edit or remove individual items in the bank.</p>
          </div>
          <input
            className="input w-full max-w-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search questions…"
          />
        </div>

        {course.questions.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-sm text-white/50">No questions yet.</p>
            <Link href={`/courses/${course.id}/upload`} className="btn-primary mt-4 inline-flex">
              + Add notes to generate questions
            </Link>
          </div>
        ) : visibleQuestions.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-sm text-white/50">No questions match your search.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleQuestions.map((q, idx) => (
              <li key={q.id}>
                {editingId === q.id ? (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    onCancel={() => setEditingId(null)}
                    onSave={onSaveQuestion}
                  />
                ) : (
                  <QuestionRow
                    index={course.questions.indexOf(q) + 1 || idx + 1}
                    question={q}
                    onEdit={() => setEditingId(q.id)}
                    onDelete={() => onDeleteQuestion(q)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuestionRow({
  index,
  question,
  onEdit,
  onDelete,
}: {
  index: number;
  question: Question;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="pill border-brand-400/30 bg-brand-500/10 text-brand-200">{question.topic}</span>
            <span className="text-xs text-white/40">Q{index}</span>
          </div>
          <p className="mt-2 font-medium leading-relaxed">{question.question}</p>
          <p className="mt-1 text-xs text-white/40">
            Correct:{" "}
            <span className="text-emerald-300">
              {String.fromCharCode(65 + question.correctIndex)}. {question.options[question.correctIndex]}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={onEdit} className="btn-ghost btn-sm">
            Edit
          </button>
          <button onClick={onDelete} className="btn-ghost btn-sm !text-rose-300 hover:!bg-rose-500/15 hover:!border-rose-400/30">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  onCancel,
  onSave,
}: {
  question: Question;
  onCancel: () => void;
  onSave: (q: Question) => void;
}) {
  const [topic, setTopic] = useState(question.topic);
  const [text, setText] = useState(question.question);
  const [options, setOptions] = useState<string[]>(question.options.slice());
  const [correctIndex, setCorrectIndex] = useState(question.correctIndex);
  const [explanation, setExplanation] = useState(question.explanation);
  const [error, setError] = useState<string | null>(null);

  const setOption = (i: number, v: string) => {
    setOptions((prev) => prev.map((o, j) => (j === i ? v : o)));
  };

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, j) => j !== i);
    setOptions(next);
    if (correctIndex === i) setCorrectIndex(0);
    else if (correctIndex > i) setCorrectIndex(correctIndex - 1);
  };

  const save = () => {
    setError(null);
    if (!text.trim()) return setError("Question text can't be empty.");
    if (options.some((o) => !o.trim())) return setError("All options must have text.");
    if (correctIndex < 0 || correctIndex >= options.length) return setError("Pick a correct answer.");
    onSave({
      ...question,
      topic: topic.trim() || question.topic,
      question: text.trim(),
      options: options.map((o) => o.trim()),
      correctIndex,
      explanation: explanation.trim(),
    });
  };

  return (
    <div className="card space-y-4 ring-1 ring-brand-400/40">
      <div className="flex items-center justify-between">
        <span className="pill border-brand-400/30 bg-brand-500/10 text-brand-200">Editing</span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost btn-sm">
            Cancel
          </button>
          <button onClick={save} className="btn-primary btn-sm">
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Topic</label>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Question</label>
        <textarea
          className="input min-h-[80px] leading-relaxed"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Options · pick the correct one</label>
        <ul className="space-y-2">
          {options.map((opt, i) => {
            const isCorrect = correctIndex === i;
            return (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-xl border p-2 transition ${
                  isCorrect ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCorrectIndex(i)}
                  title="Mark as correct"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition ${
                    isCorrect
                      ? "bg-emerald-400/30 text-emerald-200"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <input
                  className="input !py-2 flex-1 bg-transparent"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= 2}
                  className="btn-ghost btn-sm !text-rose-300 hover:!bg-rose-500/15 hover:!border-rose-400/30 disabled:opacity-40"
                  title="Remove option"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        {options.length < 6 && (
          <button onClick={addOption} className="btn-ghost btn-sm mt-2">
            + Add option
          </button>
        )}
      </div>

      <div>
        <label className="label">Explanation</label>
        <textarea
          className="input min-h-[70px] leading-relaxed"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Why is this the correct answer?"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
