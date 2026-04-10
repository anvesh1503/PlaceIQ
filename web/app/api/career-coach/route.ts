import { NextResponse } from "next/server";
import { claudeJson, claudeText } from "@/lib/claude";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message : "";
  const studentContext =
    typeof body?.studentContext === "string" ? body.studentContext : "";
  if (!message.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const system = `You are PlaceIQ Career Coach for Indian campus placements. Be concise, actionable. If asked for JSON reply with ONLY {"reply": string}.`;

  const user = `Student context:\n${studentContext || "N/A"}\n\nStudent message:\n${message}`;

  const json = await claudeJson<{ reply: string }>(
    system + " Respond as JSON only.",
    user
  );
  if (json?.reply) return NextResponse.json({ reply: json.reply });

  const text = await claudeText(system, user);
  if (text) return NextResponse.json({ reply: text });

  return NextResponse.json({
    reply:
      "Focus on one skill this week, one mock interview, and one resume bullet improvement. What role are you targeting?",
  });
}
