import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import document from "@/models/document";
import { ForbiddenError, NotFoundError } from "@/infra/errors";
import { DocumentDetailView } from "@/components/documents/DocumentDetailView";
import { DocumentTabs } from "@/components/documents/DocumentTabs";

export default async function DocumentDetailPage({
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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <DocumentTabs documentId={doc.id} active="overview" />
        <DocumentDetailView initialDocument={doc} />
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
