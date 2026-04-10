"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";
import { app, db } from "@/lib/firebase";
import { clearServerSession } from "@/lib/sync-session";
import { MobileNav } from "@/components/layout/MobileNav";
import { getMessaging, getToken } from "firebase/messaging";

type NavbarMode = "student" | "tpc";

const studentLinks = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/resume", label: "Resume" },
  { href: "/student/interview", label: "Interview" },
  { href: "/student/tools", label: "Tools" },
  { href: "/student/notifications", label: "Notifications" },
];

const tpcLinks = [
  { href: "/tpc/dashboard", label: "Dashboard" },
  { href: "/tpc/companies", label: "Companies" },
  { href: "/tpc/students", label: "Students" },
];

export function Navbar({ mode }: { mode: NavbarMode }) {
  const { user, userDoc, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const items = mode === "student" ? studentLinks : tpcLinks;
  const notifHref =
    mode === "student" ? "/student/notifications" : "/tpc/dashboard";

  useEffect(() => {
    if (!user?.uid || mode !== "student") {
      setUnread(0);
      return;
    }
    const q = query(collection(db, "notifications"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) =>
        setUnread(snap.docs.filter((d) => (d.data() as { read?: boolean }).read !== true).length),
      () => setUnread(0)
    );
    return () => unsub();
  }, [user?.uid, mode]);

  useEffect(() => {
    const vapid = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    if (!vapid || !user?.uid || mode !== "student") return;
    let cancelled = false;
    (async () => {
      try {
        const { isSupported } = await import("firebase/messaging");
        if (!(await isSupported()) || cancelled) return;
        const messaging = getMessaging(app);
        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;
        await getToken(messaging, { vapidKey: vapid });
        // Token can be sent to your backend / stored on user doc for Cloud Messaging campaigns
      } catch {
        /* FCM optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, mode]);

  async function handleLogout() {
    await clearServerSession();
    await logout();
    window.location.href = "/login";
  }

  const initials =
    (userDoc?.name || user?.email || "?")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav
          items={items}
          title={mode === "student" ? "Student" : "TPC Admin"}
        />
        <Link
          href={mode === "student" ? "/student/dashboard" : "/tpc/dashboard"}
          className="text-lg font-semibold text-slate-900 md:hidden"
        >
          PlaceIQ
        </Link>
      </div>
      <div className="flex items-center gap-2">
        {mode === "student" && (
          <Link href={notifHref} className="relative">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]">
                  {unread > 99 ? "99+" : unread}
                </Badge>
              )}
            </Button>
          </Link>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 rounded-full px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-100 text-indigo-800 text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 sm:inline">
                {userDoc?.name || user?.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
