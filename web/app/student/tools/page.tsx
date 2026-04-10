"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumeUpload } from "@/components/ResumeUpload";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function ToolsPage() {
  const [li, setLi] = useState("");
  const [gh, setGh] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileScore, setProfileScore] = useState<number | null>(null);
  const [tips, setTips] = useState<string[]>([]);

  const [jdFake, setJdFake] = useState("");
  const [fakeLoading, setFakeLoading] = useState(false);
  const [verdict, setVerdict] = useState<"Verified" | "Suspicious" | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);

  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchPct, setMatchPct] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [jdSkills, setJdSkills] = useState<string[]>([]);

  async function runProfile() {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile-analyser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinUrl: li, githubUrl: gh }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfileScore(data.score);
      setTips(data.tips || []);
      toast.success("Profile analysed");
    } catch {
      toast.error("Profile analysis failed");
    } finally {
      setProfileLoading(false);
    }
  }

  async function runFake() {
    setFakeLoading(true);
    try {
      const res = await fetch("/api/fake-job-detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: jdFake }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVerdict(data.verdict);
      setReasons(data.reasons || []);
      toast.success("Scan complete");
    } catch {
      toast.error("Detector failed");
    } finally {
      setFakeLoading(false);
    }
  }

  async function runMatch() {
    if (!resumeText.trim() || !jdText.trim()) {
      toast.error("Need resume text and JD");
      return;
    }
    setMatchLoading(true);
    try {
      const res = await fetch("/api/jd-matcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jd: jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatchPct(data.matchPercent);
      setMissing(data.missingSkills || []);
      setResumeSkills(data.resumeSkills || []);
      setJdSkills(data.jdSkills || []);
      toast.success("Match computed");
    } catch {
      toast.error("JD match failed");
    } finally {
      setMatchLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tools</h1>
        <p className="text-muted-foreground">Profile analyser, fake job detector, and JD matcher</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card id="analyser">
          <CardHeader>
            <CardTitle>LinkedIn / GitHub profile analyser</CardTitle>
            <CardDescription>Hire-readiness score and improvement tips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">LinkedIn URL</label>
                <Input value={li} onChange={(e) => setLi(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">GitHub URL</label>
                <Input value={gh} onChange={(e) => setGh(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <Button onClick={runProfile} disabled={profileLoading}>
              {profileLoading ? "Analysing…" : "Analyse profiles"}
            </Button>
            {profileLoading && <Skeleton className="h-24 w-full" />}
            {profileScore != null && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-4 border-indigo-600 text-indigo-600">
                  <span className="text-3xl font-bold leading-none">{profileScore}</span>
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
                <ul className="flex-1 space-y-2">
                  {tips.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="fake-job">
          <CardHeader>
            <CardTitle>Fake job detector</CardTitle>
            <CardDescription>Paste a job description to screen for red flags</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={jdFake}
              onChange={(e) => setJdFake(e.target.value)}
              placeholder="Paste full job description…"
              rows={8}
            />
            <Button onClick={runFake} disabled={fakeLoading}>
              {fakeLoading ? "Scanning…" : "Analyse JD"}
            </Button>
            {verdict && (
              <div className="space-y-2">
                <Badge variant={verdict === "Verified" ? "success" : "destructive"} className="text-sm">
                  {verdict === "Verified" ? "✓ Verified" : "⚠ Suspicious"}
                </Badge>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="jd-matcher">
          <CardHeader>
            <CardTitle>JD matcher</CardTitle>
            <CardDescription>Upload resume PDF and paste the job description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResumeUpload
              onFileReady={async (_f, text) => {
                setResumeText(text);
                toast.success("Resume text extracted");
              }}
            />
            <div>
              <label className="mb-1 block text-sm font-medium">Job description</label>
              <Textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={8}
                placeholder="Paste JD…"
              />
            </div>
            <Button onClick={runMatch} disabled={matchLoading}>
              {matchLoading ? "Matching…" : "Calculate match"}
            </Button>
            {matchPct != null && (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Match {matchPct}%</p>
                  <Progress value={matchPct} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>You have</TableHead>
                      <TableHead>JD requires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Math.max(resumeSkills.length, jdSkills.length, 1) > 0 && (
                      <TableRow>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-1">
                            {resumeSkills.length
                              ? resumeSkills.map((s) => (
                                  <Badge key={s} variant="secondary">
                                    {s}
                                  </Badge>
                                ))
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-1">
                            {jdSkills.length
                              ? jdSkills.map((s) => (
                                  <Badge key={s} variant="outline">
                                    {s}
                                  </Badge>
                                ))
                              : "—"}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {missing.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-red-700">Missing skills</p>
                    <div className="flex flex-wrap gap-1">
                      {missing.map((m) => (
                        <Badge key={m} variant="destructive">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
