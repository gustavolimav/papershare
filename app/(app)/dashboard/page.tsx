import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { getServerUser } from "@/lib/auth-server";

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <DashboardContent />
    </main>
  );
}
