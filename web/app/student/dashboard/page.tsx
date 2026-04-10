"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { FileText, Mic, UserSearch, Briefcase, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlacementScoreRing } from "@/components/ui/PlacementScoreRing";
import { TaskCard } from "@/components/ui/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import type { CompanyDoc, TaskItem } from "@/lib/types";
import { toDate } from "@/lib/firestore-helpers";
import { toast } from "sonner";

export default function StudentDashboardPage() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<CompanyDoc[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "companies"));
        if (cancelled) return;
        const list: CompanyDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CompanyDoc, "id">),
        }));
        const now = new Date();
        const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcoming = list.filter((c) => {
          const d = toDate(c.deadline as never);
          return d && d >= now && d <= week;
        });
        setCompanies(upcoming.sort((a, b) => {
          const da = toDate(a.deadline as never)?.getTime() || 0;
          const db = toDate(b.deadline as never)?.getTime() || 0;
          return da - db;
        }));
      } catch {
        setCompanies([]);
      } finally {
        if (!cancelled) setLoadingCompanies(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleTask(index: number, done: boolean) {
    if (!user) return;
    const list = [...(userDoc?.taskList || [])] as TaskItem[];
    if (!list[index]) return;
    list[index] = { ...list[index], done };
    try {
      await updateDoc(doc(db, "users", user.uid), { taskList: list });
      toast.success("Task updated");
    } catch {
      toast.error("Could not save task");
    }
  }

  if (authLoading || !userDoc) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const score = userDoc.placementScore ?? 0;
  const tasks = (userDoc.taskList || []) as TaskItem[];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userDoc.name}</p>
      </div>

      {userDoc.isAtRisk && (
        <div
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900"
          role="alert"
        >
          <Badge variant="destructive">At Risk</Badge>
          <p className="text-sm">
            Your placement momentum needs attention. Complete today&apos;s tasks and speak with
            your TPC mentor.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Placement score</CardTitle>
            <CardDescription>AI-assessed readiness (0–100)</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <PlacementScoreRing score={score} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s AI task list</CardTitle>
            <CardDescription>Check off tasks as you complete them</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet. Upload your resume to generate some.</p>
            ) : (
              tasks.map((t, i) => (
                <TaskCard key={i} task={t} onToggle={(d) => toggleTask(i, d)} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming deadlines</CardTitle>
          <CardDescription>Companies closing within 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCompanies ? (
            <Skeleton className="h-24 w-full" />
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deadlines in the next week.</p>
          ) : (
            <ul className="space-y-2">
              {companies.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-3 py-2"
                >
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {toDate(c.deadline as never)?.toLocaleDateString() || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild variant="outline" className="h-auto justify-start gap-2 py-4">
            <Link href="/student/resume">
              <Upload className="h-5 w-5 shrink-0 text-indigo-600" />
              <span>Upload Resume</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start gap-2 py-4">
            <Link href="/student/interview">
              <Mic className="h-5 w-5 shrink-0 text-indigo-600" />
              <span>Practice Interview</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start gap-2 py-4">
            <Link href="/student/tools#analyser">
              <UserSearch className="h-5 w-5 shrink-0 text-indigo-600" />
              <span>Analyse Profile</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start gap-2 py-4">
            <Link href="/student/tools#fake-job">
              <Briefcase className="h-5 w-5 shrink-0 text-indigo-600" />
              <span>Check Job</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
