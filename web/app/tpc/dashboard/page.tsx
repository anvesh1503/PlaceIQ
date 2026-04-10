"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RiskBadge, type RiskVariant } from "@/components/ui/RiskBadge";
import { db } from "@/lib/firebase";
import type { ApplicationDoc, InterviewDoc, UserDoc } from "@/lib/types";
import { toDate, isOlderThanDays } from "@/lib/firestore-helpers";
import { pipelineStageForStudent, type PipelineStage } from "@/lib/pipeline";
import { toast } from "sonner";

type StudentRow = { id: string } & UserDoc;

function riskForStudent(s: StudentRow): RiskVariant {
  if (s.isAtRisk) return "at-risk";
  const d = toDate(s.lastActive as never);
  if (isOlderThanDays(d, 5)) return "inactive";
  return "ok";
}

const STAGES: PipelineStage[] = [
  "Unregistered",
  "Preparing",
  "Applied",
  "Interview",
  "Offer",
];

export default function TpcDashboardPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [applications, setApplications] = useState<ApplicationDoc[]>([]);
  const [interviews, setInterviews] = useState<InterviewDoc[]>([]);
  const [companiesCount, setCompaniesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    setSuggestion(null);
  }, [selected?.id]);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "student")),
      (snap) => {
        setStudents(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserDoc) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubApps = onSnapshot(collection(db, "applications"), (snap) => {
      setApplications(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ApplicationDoc, "id">),
        }))
      );
    });

    const unsubInt = onSnapshot(collection(db, "interviews"), (snap) => {
      setInterviews(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<InterviewDoc, "id">),
        }))
      );
    });

    (async () => {
      const c = await getDocs(collection(db, "companies"));
      setCompaniesCount(c.size);
    })();

    return () => {
      unsubUsers();
      unsubApps();
      unsubInt();
    };
  }, []);

  const offersMade = useMemo(
    () => applications.filter((a) => /offer|placed|accepted/i.test(a.status || "")).length,
    [applications]
  );

  const atRiskCount = useMemo(
    () => students.filter((s) => s.isAtRisk).length,
    [students]
  );

  const pipelineCounts = useMemo(() => {
    const m: Record<PipelineStage, number> = {
      Unregistered: 0,
      Preparing: 0,
      Applied: 0,
      Interview: 0,
      Offer: 0,
    };
    for (const s of students) {
      const st = pipelineStageForStudent(s.id, s, applications, interviews);
      m[st]++;
    }
    return m;
  }, [students, applications, interviews]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.branch?.toLowerCase().includes(q)
    );
  }, [students, filter]);

  async function loadSuggestion(student: StudentRow) {
    setSuggestLoading(true);
    setSuggestion(null);
    try {
      const res = await fetch("/api/career-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "As TPC admin, give one short intervention suggestion for this at-risk student in bullet points.",
          studentContext: `Name: ${student.name}\nBranch: ${student.branch}\nCGPA: ${student.cgpa}\nSkills: ${(student.skills || []).join(", ")}\nPlacement score: ${student.placementScore}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestion(data.reply || "");
    } catch {
      toast.error("Could not load AI suggestion");
      setSuggestion("Schedule a 1:1, review resume gaps, and assign a daily DSA block.");
    } finally {
      setSuggestLoading(false);
    }
  }

  const atRiskStudents = students.filter((s) => s.isAtRisk);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">TPC Dashboard</h1>
        <p className="text-muted-foreground">Placements overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total students</CardDescription>
            <CardTitle className="text-3xl">{students.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>At-risk</CardDescription>
            <CardTitle className="text-3xl text-red-600">{atRiskCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Companies</CardDescription>
            <CardTitle className="text-3xl">{companiesCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offers made</CardDescription>
            <CardTitle className="text-3xl text-green-600">{offersMade}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Placement pipeline</CardTitle>
          <CardDescription>Students by stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-12 w-full overflow-hidden rounded-md bg-slate-100">
            {STAGES.map((st) => {
              const n = pipelineCounts[st];
              const flex = students.length ? Math.max(n, 0.2) : 1;
              return (
                <div
                  key={st}
                  className="flex min-w-[2rem] items-center justify-center border-r border-white/30 bg-indigo-600 px-1 text-center text-[10px] font-medium leading-tight text-white last:border-0 sm:text-xs"
                  style={{ flex }}
                  title={`${st}: ${n}`}
                >
                  {n > 0 ? (
                    <>
                      <span className="hidden sm:inline">{st} </span>
                      <span className="font-bold">{n}</span>
                    </>
                  ) : (
                    <span className="text-indigo-200">0</span>
                  )}
                </div>
              );
            })}
          </div>
          <ul className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {STAGES.map((st) => (
              <li key={st}>
                <span className="font-medium text-slate-800">{st}:</span>{" "}
                {pipelineCounts[st]}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>At-risk students</CardTitle>
          <CardDescription>AI-assisted intervention ideas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {atRiskStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students flagged at risk.</p>
          ) : (
            <ul className="space-y-3">
              {atRiskStudents.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{s.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(s);
                        void loadSuggestion(s);
                      }}
                    >
                      Get AI suggestion
                    </Button>
                  </div>
                  <p className="mt-1 text-muted-foreground">{s.email}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Search and open details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search name, email, branch…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(s)}
                  >
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.branch || "—"}</TableCell>
                    <TableCell>{s.cgpa ?? "—"}</TableCell>
                    <TableCell>{s.placementScore ?? "—"}</TableCell>
                    <TableCell>
                      <RiskBadge variant={riskForStudent(s)} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {toDate(s.lastActive as never)?.toLocaleDateString() || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => {
                        e.stopPropagation();
                        setSelected(s);
                      }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
          </SheetHeader>
          {selected && (
            <ScrollArea className="mt-6 h-[calc(100vh-8rem)] pr-4">
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Email:</span> {selected.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Branch:</span>{" "}
                  {selected.branch || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">CGPA:</span>{" "}
                  {selected.cgpa ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Placement score:</span>{" "}
                  {selected.placementScore ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Pipeline:</span>{" "}
                  {pipelineStageForStudent(selected.id, selected, applications, interviews)}
                </p>
                <p>
                  <span className="text-muted-foreground">Skills:</span>{" "}
                  {(selected.skills || []).join(", ") || "—"}
                </p>
                {selected.isAtRisk && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="font-medium text-amber-900">At risk</p>
                    <Button
                      size="sm"
                      className="mt-2"
                      variant="outline"
                      onClick={() => loadSuggestion(selected)}
                    >
                      Refresh AI suggestion
                    </Button>
                    {suggestLoading && <Skeleton className="mt-2 h-16 w-full" />}
                    {suggestion && !suggestLoading && (
                      <p className="mt-2 whitespace-pre-wrap text-amber-900">{suggestion}</p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
