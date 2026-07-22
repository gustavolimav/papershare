import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import document from "@/models/document";
import { ForbiddenError, NotFoundError } from "@/infra/errors";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { DocumentTabs } from "@/components/documents/DocumentTabs";

export default async function DocumentAnalyticsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const doc = await document.findOneById(params.id, user.id);

    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <DocumentTabs documentId={doc.id} active="analytics" />
        <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
          {doc.title} — Analytics
        </h1>
        <AnalyticsView documentId={doc.id} />
      </main>
    );
  } catch (error) {
    const message =
      error instanceof ForbiddenError
        ? "Você não tem permissão para acessar este documento."
        : error instanceof NotFoundError
          ? "Documento não encontrado."
          : "Não foi possível carregar o documento.";

    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-muted-foreground">{message}</p>
      </main>
    );
  }
}
