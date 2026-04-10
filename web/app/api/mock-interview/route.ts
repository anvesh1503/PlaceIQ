import { NextResponse } from "next/server";
import { claudeJson } from "@/lib/claude";

type Out = { score: number; feedback: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const question = typeof body?.question === "string" ? body.question : "";
  const answer = typeof body?.answer === "string" ? body.answer : "";
  if (!question.trim() || !answer.trim()) {
    return NextResponse.json(
      { error: "question and answer required" },
      { status: 400 }
    );
  }

  const system = `You evaluate placement interview answers. Score 0-10. Respond ONLY JSON: {"score": number, "feedback": string}.`;

  const parsed = await claudeJson<Out>(
    system,
    `Q: ${question}\n\nAnswer (spoken transcript):\n${answer.slice(0, 4000)}`
  );

  if (
    parsed &&
    typeof parsed.score === "number" &&
    typeof parsed.feedback === "string"
  ) {
    const score = Math.min(10, Math.max(0, Math.round(parsed.score)));
    return NextResponse.json({ score, feedback: parsed.feedback });
  }

  return NextResponse.json({
    score: 6,
    feedback:
      "Structure your answer with situation, action, and result. Add a concrete metric if possible.",
  });
}
