"use client";

import type { User } from "firebase/auth";

export async function syncServerSession(
  user: User,
  role?: "student" | "tpc"
): Promise<void> {
  const idToken = await user.getIdToken(true);
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, role }),
    credentials: "same-origin",
  });
}

export async function clearServerSession(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE", credentials: "same-origin" });
}
