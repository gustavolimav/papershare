import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export default async function ActivityPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Atividade
      </h1>
      <ActivityFeed />
    </main>
  );
}
