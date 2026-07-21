import { redirect } from "next/navigation";
import { DocumentList } from "@/components/documents/DocumentList";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { getServerUser } from "@/lib/auth-server";

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Meus documentos
      </h1>
      <DashboardStats />
      <DocumentList />
    </main>
  );
}
