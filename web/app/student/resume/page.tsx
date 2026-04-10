"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumeUpload } from "@/components/ResumeUpload";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import type { TaskItem } from "@/lib/types";
import { toast } from "sonner";

export default function ResumePage() {
  const { user, userDoc, loading } = useAuth();
  const [parsing, setParsing] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [gaps, setGaps] = useState<string[]>([]);
  const [taskList, setTaskList] = useState<{ title: string; category: string }[]>([]);

  async function handleFile(_file: File, text: string) {
    if (!text.trim()) {
      toast.error("No text extracted from PDF");
      return;
    }
    setParsing(true);
    try {
      const res = await fetch("/api/resume-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSkills(data.skills || []);
      setGaps(data.gaps || []);
      setTaskList(data.taskList || []);
      toast.success("Resume analysed");
    } catch {
      toast.error("Analysis failed");
    } finally {
      setParsing(false);
    }
  }

  async function saveTasks() {
    if (!user || !taskList.length) {
      toast.error("Nothing to save");
      return;
    }
    const tasks: TaskItem[] = taskList.map((t) => ({
      title: t.title,
      category: t.category,
      done: false,
    }));
    try {
      await updateDoc(doc(db, "users", user.uid), { taskList: tasks });
      toast.success("Task list saved to your profile");
    } catch {
      toast.error("Could not save to Firestore");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resume</h1>
        <p className="text-muted-foreground">Upload a PDF — we extract text locally, then AI analyses it.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>Drag and drop your resume (PDF)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUpload onFileReady={handleFile} disabled={parsing} />
          {parsing && <Skeleton className="mt-4 h-8 w-full" />}
        </CardContent>
      </Card>

      {(skills.length > 0 || gaps.length > 0 || taskList.length > 0) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Skill gaps</CardTitle>
              <CardDescription>Areas to strengthen</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {gaps.length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                gaps.map((g) => (
                  <Badge key={g} variant="destructive" className="font-normal">
                    {g}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strengths</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s} variant="success" className="font-normal">
                  {s}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated task list</CardTitle>
              <CardDescription>Save to your PlaceIQ profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {taskList.map((t, i) => (
                  <li key={i}>
                    <span className="font-medium">{t.category}:</span> {t.title}
                  </li>
                ))}
              </ul>
              <Button onClick={saveTasks}>Save task list to Firestore</Button>
            </CardContent>
          </Card>
        </>
      )}

      {userDoc?.resumeUrl && (
        <p className="text-sm text-muted-foreground">
          Stored resume URL: {userDoc.resumeUrl}
        </p>
      )}
    </div>
  );
}
