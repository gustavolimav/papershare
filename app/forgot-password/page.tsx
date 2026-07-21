import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { getServerUser } from "@/lib/auth-server";

export default async function ForgotPasswordPage() {
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
            <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
            <CardDescription>
              Informe seu e-mail e enviaremos um link para você escolher uma
              nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
