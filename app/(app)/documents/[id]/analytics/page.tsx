import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth-server";
import document from "@/models/document";
import { ForbiddenError, NotFoundError } from "@/infra/errors";
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
      <main className="mx-auto max-w-4xl px-6 py-10">
        <nav className="mb-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="hover:text-foreground hover:underline"
          >
            Dashboard
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href={`/documents/${doc.id}`}
            className="hover:text-foreground hover:underline"
          >
            {doc.title}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Analytics</span>
        </nav>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Analytics
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
