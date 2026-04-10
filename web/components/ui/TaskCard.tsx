"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskItem } from "@/lib/types";

interface TaskCardProps {
  task: TaskItem;
  onToggle: (done: boolean) => void;
  className?: string;
}

const categoryColors: Record<string, string> = {
  DSA: "bg-violet-100 text-violet-800 border-violet-200",
  Communication: "bg-sky-100 text-sky-800 border-sky-200",
  Resume: "bg-amber-100 text-amber-900 border-amber-200",
  Aptitude: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "System Design": "bg-rose-100 text-rose-800 border-rose-200",
};

export function TaskCard({ task, onToggle, className }: TaskCardProps) {
  const cat = task.category || "General";
  const colorClass =
    categoryColors[cat] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-white p-3 shadow-sm",
        className
      )}
    >
      <Checkbox
        checked={!!task.done}
        onCheckedChange={(v) => onToggle(v === true)}
        className="mt-1"
        aria-label={`Complete: ${task.title}`}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("border font-normal", colorClass)}>
            {cat}
          </Badge>
        </div>
        <p
          className={cn(
            "text-sm text-slate-800",
            task.done && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
      </div>
    </div>
  );
}
