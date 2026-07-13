"use client";

import { ViewerPage } from "@/components/viewer/ViewerPage";

export default function PublicViewerPage({
  params,
}: {
  params: { token: string };
}) {
  return <ViewerPage token={params.token} />;
}
