import { StudentSidebar } from "@/components/layout/StudentSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { RoleGuard } from "@/components/RoleGuard";
import { CareerCoachChat } from "@/components/CareerCoachChat";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowed="student">
      <div className="flex min-h-screen bg-white">
        <StudentSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar mode="student" />
          <main className="flex-1 bg-slate-50/50 p-4 md:p-8">{children}</main>
        </div>
        <CareerCoachChat />
      </div>
    </RoleGuard>
  );
}
