import Link from "next/link";
import { redirect } from "next/navigation";
import { Construction } from "lucide-react";
import { getServerUser } from "@/lib/auth-server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default async function EmBrevePage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <Card className="w-full">
          <CardHeader className="items-center">
            <Construction className="mb-2 h-8 w-8 text-muted-foreground" />
            <CardTitle>Em breve</CardTitle>
            <CardDescription>
              Estamos finalizando essa parte da cobrança. Volte em breve para
              assinar ou gerenciar seu plano.
            </CardDescription>
          </CardHeader>
        </Card>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/settings">Voltar para Configurações</Link>
        </Button>
      </main>
      <Footer />
    </>
  );
}
