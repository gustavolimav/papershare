import type { Metadata } from "next";
import { ViewerPage } from "@/components/viewer/ViewerPage";
import shareLink from "@/models/shareLink";

interface PageProps {
  params: { token: string };
}

const DEFAULT_TITLE = "Documento compartilhado";
const DEFAULT_DESCRIPTION =
  "Visualize este documento compartilhado via Papershare.";

// Crawlers/link unfurlers (Slack, iMessage, Twitter) never have the
// password or email a gated link might require, so this reads only the
// document title/description via a dedicated, permission-free lookup —
// same trade-off other file-sharing tools make (the file name is visible
// in the link preview even for a password-protected share).
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const info = await shareLink.getPublicMetadata(params.token);
  const title = info
    ? `${info.title} · Papershare`
    : `${DEFAULT_TITLE} · Papershare`;
  const description = info?.description || DEFAULT_DESCRIPTION;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Papershare",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function PublicViewerPage({ params }: PageProps) {
  return <ViewerPage token={params.token} />;
}
