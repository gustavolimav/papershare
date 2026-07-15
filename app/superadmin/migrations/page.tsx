import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MigrationsPanel } from "@/components/superadmin/MigrationsPanel";

export default async function SuperadminMigrationsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.is_superadmin) {
    redirect("/dashboard");
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">
            Migrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Veja e execute as migrations de banco de dados pendentes.
          </p>
        </div>
        <MigrationsPanel />
      </main>
      <Footer />
    </>
  );
}
