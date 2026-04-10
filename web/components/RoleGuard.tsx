"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import type { UserRole } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export function RoleGuard({
  allowed,
  children,
}: {
  allowed: UserRole;
  children: React.ReactNode;
}) {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (userDoc && userDoc.role !== allowed) {
      router.replace(allowed === "student" ? "/tpc/dashboard" : "/student/dashboard");
    }
  }, [user, userDoc, loading, allowed, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!loading && user && !userDoc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white p-8 text-center">
        <p className="text-lg font-medium text-slate-900">No profile found</p>
        <p className="max-w-md text-sm text-muted-foreground">
          This account has no document in <code className="rounded bg-slate-100 px-1">users</code>.
          Register again or ask your admin to provision your account.
        </p>
      </div>
    );
  }

  if (userDoc && userDoc.role !== allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  return <>{children}</>;
}
