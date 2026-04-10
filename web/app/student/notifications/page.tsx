"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import type { NotificationDoc } from "@/lib/types";
import { toDate } from "@/lib/firestore-helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "notifications"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<NotificationDoc, "id">),
        }));
        list.sort((a, b) => {
          const ta = toDate(a.createdAt as never)?.getTime() || 0;
          const tb = toDate(b.createdAt as never)?.getTime() || 0;
          return tb - ta;
        });
        setItems(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [user?.uid]);

  async function markRead(n: NotificationDoc) {
    if (n.read) return;
    try {
      await updateDoc(doc(db, "notifications", n.id), { read: true });
    } catch {
      toast.error("Could not update notification");
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-muted-foreground">Tap a row to mark as read</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Placement alerts and reminders</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50",
                      !n.read && "bg-indigo-50/50 font-medium"
                    )}
                    onClick={() => markRead(n)}
                  >
                    <p className="text-slate-900">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {toDate(n.createdAt as never)?.toLocaleString() || ""}
                      {!n.read && (
                        <span className="ml-2 text-indigo-600">· Unread</span>
                      )}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
