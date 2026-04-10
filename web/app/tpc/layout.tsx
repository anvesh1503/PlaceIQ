import { TpcSidebar } from "@/components/layout/TpcSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { RoleGuard } from "@/components/RoleGuard";

export default function TpcLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowed="tpc">
      <div className="flex min-h-screen bg-white">
        <TpcSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar mode="tpc" />
          <main className="flex-1 bg-slate-50/50 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
