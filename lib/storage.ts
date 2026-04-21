"use client";
import type { Attempt, Course, Question } from "./types";
import { AGG_102_SEED } from "./seed/agg102";
import { GST_112_SEED } from "./seed/gst112";
import { CHM_102_SEED } from "./seed/chm102";
import { HWM_SEED } from "./seed/hwm";
import { MTS_102_SEED } from "./seed/mts102";

const COURSES_KEY = "qp:courses";
const ATTEMPTS_KEY = "qp:attempts";
const SEEDED_KEY = "qp:seeded:v5";

const SEEDS: Course[] = [AGG_102_SEED, GST_112_SEED, CHM_102_SEED, HWM_SEED, MTS_102_SEED];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ensureSeeded(): void {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SEEDED_KEY)) return;
  const courses = readJSON<Course[]>(COURSES_KEY, []);
  let changed = false;
  for (const seed of SEEDS) {
    if (!courses.find((c) => c.id === seed.id)) {
      courses.push(seed);
      changed = true;
    }
  }
  if (changed) writeJSON(COURSES_KEY, courses);
  window.localStorage.setItem(SEEDED_KEY, "1");
}

export function listCourses(): Course[] {
  ensureSeeded();
  return readJSON<Course[]>(COURSES_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCourse(id: string): Course | undefined {
  return listCourses().find((c) => c.id === id);
}

export function saveCourse(course: Course): void {
  const all = readJSON<Course[]>(COURSES_KEY, []);
  const idx = all.findIndex((c) => c.id === course.id);
  if (idx >= 0) all[idx] = course;
  else all.push(course);
  writeJSON(COURSES_KEY, all);
}

export function deleteCourse(id: string): void {
  const all = readJSON<Course[]>(COURSES_KEY, []).filter((c) => c.id !== id);
  writeJSON(COURSES_KEY, all);
  const attempts = readJSON<Attempt[]>(ATTEMPTS_KEY, []).filter((a) => a.courseId !== id);
  writeJSON(ATTEMPTS_KEY, attempts);
}

export function addQuestions(courseId: string, questions: Question[]): Course | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;
  const existingIds = new Set(course.questions.map((q) => q.id));
  const fresh = questions.filter((q) => !existingIds.has(q.id));
  const updated: Course = {
    ...course,
    questions: [...course.questions, ...fresh],
    updatedAt: Date.now(),
  };
  saveCourse(updated);
  return updated;
}

export function updateCourseMeta(
  courseId: string,
  meta: { name?: string; description?: string }
): Course | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;
  const updated: Course = {
    ...course,
    name: meta.name !== undefined ? meta.name : course.name,
    description:
      meta.description !== undefined ? meta.description || undefined : course.description,
    updatedAt: Date.now(),
  };
  saveCourse(updated);
  return updated;
}

export function updateQuestion(courseId: string, question: Question): Course | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;
  const idx = course.questions.findIndex((q) => q.id === question.id);
  if (idx < 0) return undefined;
  const questions = course.questions.slice();
  questions[idx] = question;
  const updated: Course = { ...course, questions, updatedAt: Date.now() };
  saveCourse(updated);
  return updated;
}

export function deleteQuestion(courseId: string, questionId: string): Course | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;
  const updated: Course = {
    ...course,
    questions: course.questions.filter((q) => q.id !== questionId),
    updatedAt: Date.now(),
  };
  saveCourse(updated);
  return updated;
}

export function listAttempts(courseId?: string): Attempt[] {
  const all = readJSON<Attempt[]>(ATTEMPTS_KEY, []);
  const filtered = courseId ? all.filter((a) => a.courseId === courseId) : all;
  return filtered.sort((a, b) => b.finishedAt - a.finishedAt);
}

export function getAttempt(id: string): Attempt | undefined {
  return readJSON<Attempt[]>(ATTEMPTS_KEY, []).find((a) => a.id === id);
}

export function saveAttempt(attempt: Attempt): void {
  const all = readJSON<Attempt[]>(ATTEMPTS_KEY, []);
  all.push(attempt);
  writeJSON(ATTEMPTS_KEY, all);
}
