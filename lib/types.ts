export type QuestionType = "mcq" | "truefalse";

export interface Question {
  id: string;
  type: QuestionType;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  questions: Question[];
}

export interface AnswerRecord {
  questionId: string;
  chosenIndex: number | null;
  correct: boolean;
  timeMs: number;
}

export interface Attempt {
  id: string;
  courseId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  questionIds: string[];
  answers: AnswerRecord[];
  score: number;
  total: number;
}
