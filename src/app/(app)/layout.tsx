import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
        <div className="bg-amber-500 text-white text-center text-xs py-1 font-medium">
          Mode demonstration — Donnees fictives
        </div>
      )}
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
