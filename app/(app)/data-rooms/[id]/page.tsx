import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { DataRoomDetail } from "@/components/data-rooms/DataRoomDetail";

interface PageProps {
  params: { id: string };
}

export default async function DataRoomDetailPage({ params }: PageProps) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <DataRoomDetail id={params.id} />
    </main>
  );
}
