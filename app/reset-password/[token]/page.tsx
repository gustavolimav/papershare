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
      <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
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
