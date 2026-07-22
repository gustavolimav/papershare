import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { AuthTabs } from "@/components/forms/AuthTabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { getServerUser } from "@/lib/auth-server";

export default async function RegisterPage() {
  const user = await getServerUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <Header />
      <main className="flex flex-col items-center px-4 py-16 sm:py-24">
        <Link
          href="/"
          className="mb-8 font-heading text-2xl font-semibold tracking-tight"
        >
          Papershare
        </Link>
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="text-center">
            <AuthTabs active="register" />
            <CardTitle className="text-2xl">Crie sua conta</CardTitle>
            <CardDescription>
              Comece a compartilhar seus documentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
