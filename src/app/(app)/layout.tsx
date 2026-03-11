import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getEnvironnement } from "@/lib/environnement";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const environnement = await getEnvironnement();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header environnement={environnement} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
