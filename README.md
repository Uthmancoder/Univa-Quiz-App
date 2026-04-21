# Practice Platform

A lightweight, frontend-first quiz/practice platform. Students upload notes, Claude generates MCQ practice questions, and students take randomized timed tests, see scores, and review what they missed.

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind. Courses, questions, and attempts live in the browser's `localStorage`. The only server piece is `/api/generate`, which calls the Claude API.

## Features

- Seeded course: **AGG 102 — Introduction to Soil Science** (~110 MCQs across 5 topics).
- Create new courses and paste/upload notes — questions are auto-generated.
- Each test = 30 random questions, 15-minute timer, shuffled option order.
- Every retry picks a fresh random subset and re-shuffles options.
- Per-attempt review: see correct answer, your answer, and the explanation for each missed question.
- Score history per course; best-score stat.

## Setup

```bash
cd quiz-platform
npm install
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## How it works

- `lib/seed/agg102.ts` — seeded AGG 102 question bank.
- `lib/storage.ts` — localStorage read/write for courses and attempts (browser-only).
- `app/api/generate/route.ts` — POSTs notes to the Claude API and returns validated MCQ JSON.
- `app/courses/[courseId]/quiz/page.tsx` — timed quiz runner.
- `app/courses/[courseId]/results/[attemptId]/page.tsx` — review screen with filter (missed / correct / all).

## Adding more notes to a course

From a course page, click **+ Add notes**. Paste or upload `.txt`/`.md`, pick how many questions to generate (5–40), and submit. New questions are appended to the course bank — future attempts randomly sample from the whole pool.
