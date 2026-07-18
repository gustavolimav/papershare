import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { AiSettingsForm } from "@/components/settings/AiSettingsForm";
import { TeamSettingsForm } from "@/components/workspaces/TeamSettingsForm";
import { BillingSettingsForm } from "@/components/billing/BillingSettingsForm";
import { DangerZone } from "@/components/settings/DangerZone";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Strip the password hash before this crosses the Server -> Client
  // Component boundary — it would otherwise be serialized into the page's
  // RSC payload and visible in the browser.
  const publicUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
    is_superadmin: user.is_superadmin,
    active_workspace_id: user.active_workspace_id,
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl space-y-8 px-4 py-10">
        <div>
          <h1 className="mb-6 text-2xl font-semibold tracking-tight">
            Configurações
          </h1>
          <h2 className="mb-3 text-lg font-semibold">Perfil</h2>
          <ProfileForm user={publicUser} />
        </div>

        <Separator />

        <div>
          <h2 className="mb-3 text-lg font-semibold">IA</h2>
          <AiSettingsForm username={publicUser.username} />
        </div>

        <Separator />

        <div>
          <h2 className="mb-3 text-lg font-semibold">Equipe</h2>
          <TeamSettingsForm />
        </div>

        <Separator />

        <div>
          <h2 className="mb-3 text-lg font-semibold">Faturamento</h2>
          <Suspense fallback={null}>
            <BillingSettingsForm />
          </Suspense>
        </div>

        <Separator />

        <DangerZone user={publicUser} />
      </main>
      <Footer />
    </>
  );
}
