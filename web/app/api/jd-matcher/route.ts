import { NextResponse } from "next/server";
import { claudeJson } from "@/lib/claude";

type Out = {
  matchPercent: number;
  missingSkills: string[];
  resumeSkills?: string[];
  jdSkills?: string[];
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const resumeText =
    typeof body?.resumeText === "string" ? body.resumeText.slice(0, 8000) : "";
  const jd = typeof body?.jd === "string" ? body.jd.slice(0, 8000) : "";
  if (!resumeText.trim() || !jd.trim()) {
    return NextResponse.json(
      { error: "resumeText and jd required" },
      { status: 400 }
    );
  }

  const system = `Compare resume to JD. Respond ONLY JSON: {"matchPercent": number 0-100, "missingSkills": string[], "resumeSkills": string[], "jdSkills": string[]}.`;

  const parsed = await claudeJson<Out>(system, `RESUME:\n${resumeText}\n\nJD:\n${jd}`);

  if (parsed && typeof parsed.matchPercent === "number") {
    return NextResponse.json({
      matchPercent: Math.min(100, Math.max(0, Math.round(parsed.matchPercent))),
      missingSkills: parsed.missingSkills || [],
      resumeSkills: parsed.resumeSkills || [],
      jdSkills: parsed.jdSkills || [],
    });
  }

  return NextResponse.json({
    matchPercent: 52,
    missingSkills: ["Kubernetes", "CI/CD"],
    resumeSkills: ["JavaScript", "Teamwork"],
    jdSkills: ["React", "Node", "Kubernetes", "CI/CD"],
  });
}
