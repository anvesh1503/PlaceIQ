"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PlacementScoreRingProps {
  score: number;
  className?: string;
  size?: number;
  stroke?: number;
}

export function PlacementScoreRing({
  score,
  className,
  size = 160,
  stroke = 10,
}: PlacementScoreRingProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(clamped));
    return () => cancelAnimationFrame(t);
  }, [clamped]);

  const displayOffset = c - (animated / 100) * c;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          className="text-indigo-600 transition-[stroke-dashoffset] duration-1000 ease-out"
          strokeDasharray={c}
          strokeDashoffset={displayOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">{Math.round(animated)}</span>
        <span className="text-xs text-muted-foreground">Placement</span>
      </div>
    </div>
  );
}
