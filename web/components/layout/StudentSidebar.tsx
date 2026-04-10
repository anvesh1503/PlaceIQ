"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Mic,
  Wrench,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/resume", label: "Resume", icon: FileText },
  { href: "/student/interview", label: "Interview", icon: Mic },
  { href: "/student/tools", label: "Tools", icon: Wrench },
  { href: "/student/notifications", label: "Notifications", icon: Bell },
];

export function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-800 bg-[#0f172a] text-slate-100 md:flex">
      <div className="border-b border-slate-800 px-4 py-5">
        <Link href="/student/dashboard" className="text-lg font-semibold text-white">
          PlaceIQ
        </Link>
        <p className="text-xs text-slate-400">Student</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
