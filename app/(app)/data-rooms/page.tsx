import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { DataRoomsList } from "@/components/data-rooms/DataRoomsList";

export default async function DataRoomsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Data rooms
        </h1>
      </div>
      <DataRoomsList />
    </main>
  );
}
