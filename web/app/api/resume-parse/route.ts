import { NextResponse } from "next/server";
import { claudeJson } from "@/lib/claude";

type Out = { skills: string[]; gaps: string[]; taskList: { title: string; category: string }[] };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const resumeText = typeof body?.resumeText === "string" ? body.resumeText.slice(0, 12000) : "";
  if (!resumeText.trim()) {
    return NextResponse.json({ error: "resumeText required" }, { status: 400 });
  }

  const system = `You are a placement coach. Respond with ONLY valid JSON: {"skills": string[], "gaps": string[], "taskList": [{"title": string, "category": "DSA"|"Communication"|"Resume"|"Aptitude"|"System Design"}]}. Max 8 skills, 5 gaps, 5 tasks.`;

  const parsed = await claudeJson<Out>(
    system,
    `Resume text:\n${resumeText}`
  );

  if (parsed?.skills && parsed?.gaps && parsed?.taskList) {
    return NextResponse.json(parsed);
  }

  return NextResponse.json({
    skills: ["Communication", "Problem solving"],
    gaps: ["Add measurable project outcomes", "Quantify internship impact"],
    taskList: [
      { title: "Solve 2 medium LeetCode array problems", category: "DSA" },
      { title: "Record a 2-min elevator pitch", category: "Communication" },
      { title: "Tailor resume bullet to STAR format", category: "Resume" },
    ],
  });
}
