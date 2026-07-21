import { redirect } from "next/navigation";
import { DocumentList } from "@/components/documents/DocumentList";
import { getServerUser } from "@/lib/auth-server";

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Meus documentos
      </h1>
      <DocumentList />
    </main>
  );
}
