import { NextResponse } from "next/server";
import { claudeJson } from "@/lib/claude";

type Out = { score: number; tips: string[] };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const linkedinUrl = typeof body?.linkedinUrl === "string" ? body.linkedinUrl : "";
  const githubUrl = typeof body?.githubUrl === "string" ? body.githubUrl : "";
  if (!linkedinUrl.trim() && !githubUrl.trim()) {
    return NextResponse.json(
      { error: "linkedinUrl or githubUrl required" },
      { status: 400 }
    );
  }

  const system = `Assess hire readiness from profile URLs (you cannot fetch; infer from URL patterns and typical gaps). Respond ONLY JSON: {"score": number 0-10, "tips": string[] exactly 5}.`;

  const parsed = await claudeJson<Out>(
    system,
    `LinkedIn: ${linkedinUrl || "n/a"}\nGitHub: ${githubUrl || "n/a"}`
  );

  if (parsed && typeof parsed.score === "number" && Array.isArray(parsed.tips)) {
    const score = Math.min(10, Math.max(0, Math.round(parsed.score)));
    return NextResponse.json({ score, tips: parsed.tips.slice(0, 5) });
  }

  return NextResponse.json({
    score: 6,
    tips: [
      "Pin two flagship projects with metrics on LinkedIn.",
      "Add README with setup steps on your top GitHub repo.",
      "Align headline with target role keywords.",
      "Request two credible recommendations.",
      "Keep GitHub green with small meaningful commits.",
    ],
  });
}
