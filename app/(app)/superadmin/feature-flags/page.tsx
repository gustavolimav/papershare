import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { FeatureFlagsPanel } from "@/components/superadmin/FeatureFlagsPanel";

export default async function SuperadminFeatureFlagsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.is_superadmin) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Feature flags
        </h1>
        <p className="text-sm text-muted-foreground">
          Ligue ou desligue recursos ainda não prontos para todos os usuários.
          Veja também{" "}
          <Link href="/superadmin/migrations" className="underline">
            Migrations
          </Link>
          .
        </p>
      </div>
      <FeatureFlagsPanel />
    </main>
  );
}
