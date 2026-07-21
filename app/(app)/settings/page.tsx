import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { AiSettingsForm } from "@/components/settings/AiSettingsForm";
import { TeamSettingsForm } from "@/components/workspaces/TeamSettingsForm";
import { BillingSettingsForm } from "@/components/billing/BillingSettingsForm";
import { DangerZone } from "@/components/settings/DangerZone";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

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
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Configurações
      </h1>

      <SettingsTabs
        perfil={
          <div>
            <h2 className="mb-3 text-lg font-semibold">Perfil</h2>
            <ProfileForm user={publicUser} />
          </div>
        }
        ia={
          <div>
            <h2 className="mb-3 text-lg font-semibold">Chave de IA</h2>
            <AiSettingsForm username={publicUser.username} />
          </div>
        }
        equipe={
          <div>
            <h2 className="mb-3 text-lg font-semibold">Equipe</h2>
            <TeamSettingsForm />
          </div>
        }
        faturamento={
          <div>
            <h2 className="mb-3 text-lg font-semibold">Faturamento</h2>
            <Suspense fallback={null}>
              <BillingSettingsForm />
            </Suspense>
          </div>
        }
        perigo={<DangerZone user={publicUser} />}
      />
    </main>
  );
}
