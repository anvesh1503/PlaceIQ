"use client";

import { useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export function CareerCoachChat() {
  const { userDoc } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! Ask me about roles, resumes, or interview prep.",
    },
  ]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const ctx = [
        userDoc?.name && `Name: ${userDoc.name}`,
        userDoc?.branch && `Branch: ${userDoc.branch}`,
        userDoc?.cgpa != null && `CGPA: ${userDoc.cgpa}`,
        userDoc?.skills?.length && `Skills: ${userDoc.skills.join(", ")}`,
        userDoc?.placementScore != null && `Placement score: ${userDoc.placementScore}`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/career-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, studentContext: ctx }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessages((m) => [...m, { role: "assistant", text: data.reply || "…" }]);
    } catch {
      toast.error("Could not reach career coach");
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
          aria-label="Open career coach"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>AI Career Coach</SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 flex-1 pr-4">
          <div className="flex flex-col gap-3 pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user"
                    ? "ml-8 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white"
                    : "mr-8 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800"
                }
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="mr-8 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking…
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="mt-auto flex gap-2 border-t pt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={loading}
          />
          <Button type="button" size="icon" onClick={send} disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
