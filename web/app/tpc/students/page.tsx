"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RiskBadge, type RiskVariant } from "@/components/ui/RiskBadge";
import { db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";
import { toDate, isOlderThanDays } from "@/lib/firestore-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";

type StudentRow = { id: string } & UserDoc;

function riskForStudent(s: StudentRow): RiskVariant {
  if (s.isAtRisk) return "at-risk";
  const d = toDate(s.lastActive as never);
  if (isOlderThanDays(d, 5)) return "inactive";
  return "ok";
}

export default function TpcStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<StudentRow | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "student")),
      (snap) => {
        setStudents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserDoc) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="text-muted-foreground">All registered students</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Search and open a profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search…"
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(s);
                        }}
                      >
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
              <div className="space-y-2 text-sm">
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
                  <span className="text-muted-foreground">Skills:</span>{" "}
                  {(selected.skills || []).join(", ") || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">LinkedIn:</span>{" "}
                  {selected.linkedinUrl || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">GitHub:</span>{" "}
                  {selected.githubUrl || "—"}
                </p>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
