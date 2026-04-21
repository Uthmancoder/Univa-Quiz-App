import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

interface GenRequest {
  notes: string;
  count?: number;
  topicHint?: string;
}

interface ModelQuestion {
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const SYSTEM = `You are an expert tutor who writes high-quality multiple-choice practice questions for students.

Given a set of study notes, produce a JSON array of practice questions. Rules:
- Each question object: { "topic": string, "question": string, "options": string[4], "correctIndex": 0..3, "explanation": string }
- Exactly 4 options per question, plausible distractors, only ONE correct.
- "topic" should be a short topic label derived from the notes (e.g., "Soil Fertility").
- "explanation" is 1–2 sentences, student-friendly, explaining WHY the answer is correct.
- Do NOT repeat questions. Vary phrasing and difficulty.
- Output MUST be a single valid JSON array — no prose, no markdown fences, no commentary.`;

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Model did not return a JSON array");
  return JSON.parse(candidate.slice(start, end + 1));
}

function validate(items: unknown): ModelQuestion[] {
  if (!Array.isArray(items)) throw new Error("Expected JSON array");
  const out: ModelQuestion[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const q = raw as Record<string, unknown>;
    const question = typeof q.question === "string" ? q.question.trim() : "";
    const topic = typeof q.topic === "string" ? q.topic.trim() : "General";
    const options = Array.isArray(q.options) ? q.options.map(String) : [];
    const correctIndex = Number(q.correctIndex);
    const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
    if (!question || options.length !== 4) continue;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) continue;
    out.push({ topic, question, options, correctIndex, explanation });
  }
  return out;
}

export async function POST(req: Request) {
  let body: GenRequest;
  try {
    body = (await req.json()) as GenRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const notes = (body.notes || "").trim();
  const count = Math.max(5, Math.min(Number(body.count) || 25, 40));
  const topicHint = body.topicHint?.trim();

  if (!notes) return NextResponse.json({ error: "notes is required" }, { status: 400 });
  if (notes.length < 80) {
    return NextResponse.json({ error: "Notes are too short — please paste more content." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local." },
      { status: 500 },
    );
  }

  const client = new Anthropic({ apiKey });

  const user = `${topicHint ? `Topic hint: ${topicHint}\n\n` : ""}Generate ${count} multiple-choice practice questions from the notes below. Return ONLY the JSON array.\n\n--- NOTES START ---\n${notes}\n--- NOTES END ---`;

  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });

    const text = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    const parsed = validate(extractJSON(text));
    if (!parsed.length) {
      return NextResponse.json({ error: "Model returned no usable questions." }, { status: 502 });
    }
    return NextResponse.json({ questions: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
  }
}
