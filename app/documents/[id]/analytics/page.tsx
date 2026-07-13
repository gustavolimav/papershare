import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth-server";
import document from "@/models/document";
import { ForbiddenError, NotFoundError } from "@/infra/errors";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

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
      <>
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            {" → "}
            <Link href={`/documents/${doc.id}`} className="hover:underline">
              {doc.title}
            </Link>
            {" → Analytics"}
          </nav>
          <AnalyticsView documentId={doc.id} />
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
