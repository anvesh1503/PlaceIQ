"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import type { CompanyDoc, UserDoc } from "@/lib/types";
import { toDate } from "@/lib/firestore-helpers";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function TpcCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [jd, setJd] = useState("");
  const [ctc, setCtc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "companies"), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CompanyDoc, "id">),
      }));
      setCompanies(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ids = new Set<string>();
    companies.forEach((c) => (c.matchedStudents || []).slice(0, 3).forEach((id) => ids.add(id)));
    if (!ids.size) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = { ...studentNames };
      for (const uid of ids) {
        if (next[uid]) continue;
        const s = await getDoc(doc(db, "users", uid));
        if (cancelled) return;
        if (s.exists()) {
          const u = s.data() as UserDoc;
          next[uid] = u.name || uid.slice(0, 6);
        }
      }
      if (!cancelled) setStudentNames((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [companies]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Company name is required";
    if (!jd.trim()) e.jd = "Job description is required";
    if (!deadline) e.deadline = "Deadline is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const d = new Date(deadline);
      const ref = await addDoc(collection(db, "companies"), {
        name: name.trim(),
        jd: jd.trim(),
        ctc: ctc.trim() || null,
        deadline: Timestamp.fromDate(d),
        matchedStudents: [],
      });
      setOpen(false);
      setName("");
      setJd("");
      setCtc("");
      setDeadline("");
      toast.success("Company added");
      try {
        await fetch("/api/company-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: ref.id }),
        });
        toast.message("AI is matching students…", {
          description: "Matches will appear when your Cloud Function completes.",
        });
      } catch {
        toast.error("Could not trigger company-match");
      }
    } catch {
      toast.error("Failed to save company");
    } finally {
      setSaving(false);
    }
  }

  const sorted = useMemo(() => {
    return [...companies].sort((a, b) => {
      const ta = toDate(a.deadline as never)?.getTime() || 0;
      const tb = toDate(b.deadline as never)?.getTime() || 0;
      return ta - tb;
    });
  }, [companies]);

  function countdown(c: CompanyDoc) {
    const d = toDate(c.deadline as never);
    if (!d) return "—";
    const ms = d.getTime() - Date.now();
    if (ms < 0) return "Closed";
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return `${days}d left`;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-muted-foreground">Manage drives and JDs</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add company</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Company name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>
              <div>
                <Label>Job description</Label>
                <Textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={6} />
                {errors.jd && <p className="text-sm text-red-600">{errors.jd}</p>}
              </div>
              <div>
                <Label>CTC (optional)</Label>
                <Input value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="e.g. 12 LPA" />
              </div>
              <div>
                <Label>Application deadline</Label>
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                {errors.deadline && <p className="text-sm text-red-600">{errors.deadline}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground md:col-span-2">No companies yet.</p>
        ) : (
          sorted.map((c) => {
            const matched = c.matchedStudents || [];
            const top = matched.slice(0, 3);
            return (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                        {matched.length} matches
                      </span>
                      <span className="text-amber-700">{countdown(c)}</span>
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{c.jd}</p>
                  {c.ctc && <p className="text-sm font-medium text-slate-800">CTC: {c.ctc}</p>}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Top matches:</span>
                    <div className="flex -space-x-2">
                      {top.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        top.map((uid) => (
                          <Avatar key={uid} className="h-8 w-8 border-2 border-white">
                            <AvatarFallback className="bg-indigo-100 text-[10px] text-indigo-800">
                              {(studentNames[uid] || "?")
                                .split(" ")
                                .map((x) => x[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deadline:{" "}
                    {toDate(c.deadline as never)?.toLocaleString() || "—"}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
