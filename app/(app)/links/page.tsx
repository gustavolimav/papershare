import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { LinksInventory } from "@/components/links-inventory/LinksInventory";

export default async function LinksInventoryPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Links de compartilhamento
      </h1>
      <LinksInventory />
    </main>
  );
}
