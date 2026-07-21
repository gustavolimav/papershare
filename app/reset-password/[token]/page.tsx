import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface PageProps {
  params: { token: string };
}

export default function ResetPasswordPage({ params }: PageProps) {
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
            <CardTitle className="text-2xl">Redefinir senha</CardTitle>
            <CardDescription>
              Escolha uma nova senha para sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm token={params.token} />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
