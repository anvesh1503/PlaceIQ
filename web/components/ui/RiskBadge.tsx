import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RiskVariant = "at-risk" | "inactive" | "ok";

interface RiskBadgeProps {
  variant: RiskVariant;
  label?: string;
  className?: string;
}

export function RiskBadge({ variant, label, className }: RiskBadgeProps) {
  const map = {
    "at-risk": { v: "destructive" as const, text: label || "At Risk" },
    inactive: { v: "warning" as const, text: label || "Inactive" },
    ok: { v: "success" as const, text: label || "Active" },
  };
  const { v, text } = map[variant];
  return (
    <Badge variant={v} className={cn("font-medium", className)}>
      {text}
    </Badge>
  );
}
