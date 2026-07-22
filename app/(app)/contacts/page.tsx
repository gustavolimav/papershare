import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { ContactsList } from "@/components/contacts/ContactsList";

export default async function ContactsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Contatos
      </h1>
      <ContactsList />
    </main>
  );
}
