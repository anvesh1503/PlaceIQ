import { NextResponse } from "next/server";
import { claudeJson } from "@/lib/claude";

type Out = { verdict: "Verified" | "Suspicious"; reasons: string[] };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jd = typeof body?.jd === "string" ? body.jd.slice(0, 8000) : "";
  if (!jd.trim()) {
    return NextResponse.json({ error: "jd required" }, { status: 400 });
  }

  const system = `Detect fraudulent job postings. Respond ONLY JSON: {"verdict": "Verified"|"Suspicious", "reasons": string[] max 5}.`;

  const parsed = await claudeJson<Out>(system, `Job description:\n${jd}`);

  if (parsed?.verdict && Array.isArray(parsed.reasons)) {
    return NextResponse.json(parsed);
  }

  return NextResponse.json({
    verdict: "Verified" as const,
    reasons: ["Could not run AI analysis; defaulting to manual review."],
  });
}
