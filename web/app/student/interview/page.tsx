"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Mic, Square } from "lucide-react";

const QUESTIONS = [
  "Tell me about yourself and why you chose your branch.",
  "Describe a challenging project you worked on and your role in it.",
  "How do you prioritise tasks when multiple deadlines clash?",
  "Explain a technical concept you know well to a non-technical person.",
  "Where do you see yourself in three years, and how does this role fit?",
];

function getRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

export default function InterviewPage() {
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState<{ score: number; feedback: string }[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [finished, setFinished] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  const cleanupRec = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => () => cleanupRec(), [cleanupRec]);

  function startListen() {
    const rec = getRecognition();
    if (!rec) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    cleanupRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    let finalText = transcript;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0]?.transcript || "";
        else interim += r[0]?.transcript || "";
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = () => {
      toast.error("Speech error — try again or type your answer.");
      cleanupRec();
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopListen() {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  async function submitAnswer() {
    const q = QUESTIONS[step];
    const answer = transcript.trim();
    if (!answer) {
      toast.error("Speak or type an answer first");
      return;
    }
    stopListen();
    setEvaluating(true);
    try {
      const res = await fetch("/api/mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults((r) => [...r, { score: data.score, feedback: data.feedback }]);
      setTranscript("");
      if (step < QUESTIONS.length - 1) {
        setStep((s) => s + 1);
      } else {
        setFinished(true);
        const scores = [...results, { score: data.score, feedback: data.feedback }];
        const avg =
          scores.reduce((a, b) => a + b.score, 0) / Math.max(1, scores.length);
        if (avg < 6 && user) {
          await updateDoc(doc(db, "users", user.uid), {
            weeklyPlan:
              "Mock interview scores were below target. Focus: STAR answers, one DSA medium daily, and record 3-minute project walkthrough.",
          });
          toast.message("Your weekly plan has been updated", {
            description: "Keep practicing — consistency beats perfection.",
          });
        }
      }
    } catch {
      toast.error("Could not evaluate answer");
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const progress = finished ? 100 : ((step + 1) / QUESTIONS.length) * 100;
  const overall =
    results.length > 0
      ? results.reduce((a, b) => a + b.score, 0) / results.length
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Voice mock interview</h1>
        <p className="text-muted-foreground">Five questions — speak your answer, then submit.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">
              Question {finished ? QUESTIONS.length : step + 1} / {QUESTIONS.length}
            </CardTitle>
            <Badge variant="secondary">{listening ? "Listening…" : "Ready"}</Badge>
          </div>
          <CardDescription>Uses your browser&apos;s Web Speech API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          {!finished ? (
            <>
              <p className="text-base font-medium text-slate-900">{QUESTIONS[step]}</p>
              <div className="min-h-[120px] rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                {transcript || (
                  <span className="text-muted-foreground">
                    Live transcript appears as you speak…
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!listening ? (
                  <Button type="button" onClick={startListen} variant="outline">
                    <Mic className="mr-2 h-4 w-4" />
                    Start speaking
                  </Button>
                ) : (
                  <Button type="button" onClick={stopListen} variant="secondary">
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                )}
                <Button type="button" onClick={submitAnswer} disabled={evaluating}>
                  {evaluating ? "Evaluating…" : "Submit answer"}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-slate-900">
                Overall score:{" "}
                {overall != null ? overall.toFixed(1) : "—"}
                /10
              </p>
              {overall != null && overall < 6 && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Your weekly plan has been updated based on this session.
                </p>
              )}
              <ul className="space-y-3">
                {QUESTIONS.map((q, i) => (
                  <li key={i} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium text-slate-800">{q}</p>
                    {results[i] && (
                      <>
                        <p className="mt-1 text-indigo-600">Score: {results[i].score}/10</p>
                        <p className="text-muted-foreground">{results[i].feedback}</p>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(0);
                  setResults([]);
                  setTranscript("");
                  setFinished(false);
                }}
              >
                Start over
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
