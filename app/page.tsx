import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Link as LinkIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getServerUser } from "@/lib/auth-server";

export default async function HomePage() {
  const user = await getServerUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <Header />

      <main>
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Papershare
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Envie documentos, gere links configuráveis e acompanhe como as
            pessoas interagem com o seu conteúdo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Começar agora</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-24 sm:grid-cols-3">
          <FeatureCard
            icon={<Upload className="h-6 w-6" />}
            title="Envie documentos"
            description="Faça upload de PDF, DOCX e PPTX em segundos."
          />
          <FeatureCard
            icon={<LinkIcon className="h-6 w-6" />}
            title="Compartilhe com links"
            description="Gere links configuráveis com senha, expiração e controle de download."
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="Acompanhe métricas"
            description="Veja quem visualizou, quando e por quanto tempo."
          />
        </section>
      </main>

      <Footer />
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 text-primary">{icon}</div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
