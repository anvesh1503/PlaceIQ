"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth, db } from "@/lib/firebase";
import { syncServerSession } from "@/lib/sync-session";
import type { UserRole } from "@/lib/types";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branch, setBranch] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addSkill() {
    const s = skillInput.trim();
    if (!s) return;
    if (!skills.includes(s)) setSkills((x) => [...x, s]);
    setSkillInput("");
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (password.length < 6) e.password = "At least 6 characters";
    if (!branch.trim()) e.branch = "Branch is required";
    if (!cgpa.trim()) e.cgpa = "CGPA is required";
    else if (Number.isNaN(Number(cgpa))) e.cgpa = "Invalid CGPA";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      const cgpaNum = cgpa.trim() ? Number(cgpa) : undefined;
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        email: email.trim(),
        role,
        branch: branch.trim(),
        cgpa: cgpaNum,
        skills,
        linkedinUrl: linkedinUrl.trim() || null,
        githubUrl: githubUrl.trim() || null,
        placementScore: role === "student" ? 50 : 0,
        riskScore: 0,
        lastActive: serverTimestamp(),
        isAtRisk: false,
        taskList: [
          { title: "Complete your resume upload", category: "Resume", done: false },
          { title: "Practice one mock question", category: "Communication", done: false },
        ],
        weeklyPlan: "",
        resumeUrl: null,
      });
      await syncServerSession(cred.user, role);
      toast.success("Account created");
      router.replace(role === "tpc" ? "/tpc/dashboard" : "/student/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code.includes("email-already")) toast.error("Email already in use");
      else toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-slate-200 shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>Join PlaceIQ as a student or TPC admin</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Role</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="role"
                    checked={role === "student"}
                    onChange={() => setRole("student")}
                  />
                  Student
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="role"
                    checked={role === "tpc"}
                    onChange={() => setRole("tpc")}
                  />
                  TPC Admin
                </label>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
              {errors.branch && <p className="text-sm text-red-600">{errors.branch}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cgpa">CGPA</Label>
              <Input id="cgpa" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
              {errors.cgpa && <p className="text-sm text-red-600">{errors.cgpa}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Type and press Enter"
                />
                <Button type="button" variant="secondary" onClick={addSkill}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs text-indigo-800"
                    onClick={() => setSkills((x) => x.filter((y) => y !== s))}
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="li">LinkedIn URL</Label>
              <Input
                id="li"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="gh">GitHub URL</Label>
              <Input
                id="gh"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Register"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
