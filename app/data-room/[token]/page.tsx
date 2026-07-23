import type { Metadata } from "next";
import { DataRoomViewerPage } from "@/components/data-room-viewer/DataRoomViewerPage";

interface PageProps {
  params: { token: string };
}

export function generateMetadata(): Metadata {
  return {
    title: "Data room · Papershare",
    description: "Visualize esta data room compartilhada via Papershare.",
  };
}

export default function PublicDataRoomPage({ params }: PageProps) {
  return <DataRoomViewerPage token={params.token} />;
}
