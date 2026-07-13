import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import document from "@/models/document";
import { ForbiddenError, NotFoundError } from "@/infra/errors";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DocumentDetailView } from "@/components/documents/DocumentDetailView";

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
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <DocumentDetailView initialDocument={doc} />
        </main>
        <Footer />
      </>
    );
  } catch (error) {
    const message =
      error instanceof ForbiddenError
        ? "Você não tem permissão para acessar este documento."
        : error instanceof NotFoundError
          ? "Documento não encontrado."
          : "Não foi possível carregar o documento.";

    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <p className="text-muted-foreground">{message}</p>
        </main>
        <Footer />
      </>
    );
  }
}
