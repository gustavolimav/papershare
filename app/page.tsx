import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Upload,
  Link as LinkIcon,
  Lock,
  ShieldCheck,
  MailCheck,
  Palette,
  Flame,
  Gauge,
  Sparkles,
  MessageSquare,
  Users,
  Shield,
  Send,
  Check,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
          <Badge
            variant="outline"
            className="h-auto rounded-full border-primary/30 bg-primary/5 px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-primary uppercase"
          >
            Compartilhamento de documentos, feito para gerar confiança
          </Badge>
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-6xl">
            Envie. Veja o que
            <br />
            acontece depois.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Envie documentos, gere links configuráveis e acompanhe como as
            pessoas interagem com o seu conteúdo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="h-11 px-6" asChild>
              <Link href="/register">Começar grátis</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-6" asChild>
              <Link href="/login">
                <PlayCircle className="h-4 w-4" />
                Ver um visualizador ao vivo
              </Link>
            </Button>
          </div>
        </section>

        <FeatureSection title="Documentos & Compartilhamento">
          <FeatureCard
            icon={<Upload className="h-6 w-6" />}
            title="Envie documentos"
            description="Faça upload de PDF, DOCX e PPTX em segundos."
          />
          <FeatureCard
            icon={<LinkIcon className="h-6 w-6" />}
            title="Links configuráveis"
            description="Senha, data de expiração e controle de download em cada link."
          />
          <FeatureCard
            icon={<Send className="h-6 w-6" />}
            title="Duplicar configurações"
            description="Reaproveite as regras de um link existente ao criar o próximo."
          />
        </FeatureSection>

        <FeatureSection title="Segurança & Confiança" tone="muted">
          <FeatureCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Gate de NDA"
            description="Exija a aceitação de um termo de confidencialidade antes do acesso."
          />
          <FeatureCard
            icon={<MailCheck className="h-6 w-6" />}
            title="Lista de emails permitidos"
            description="Restrinja o acesso a um conjunto específico de destinatários."
          />
          <FeatureCard
            icon={<Lock className="h-6 w-6" />}
            title="Marca d'água dinâmica"
            description="Marca d'água com o email do visitante em cada página vista."
          />
          <FeatureCard
            icon={<Palette className="h-6 w-6" />}
            title="Branding personalizado"
            description="Cor de destaque e mensagem de boas-vindas por link."
          />
        </FeatureSection>

        <FeatureSection title="Analytics & IA">
          <FeatureCard
            icon={<Flame className="h-6 w-6" />}
            title="Heatmap de páginas"
            description="Veja em quais páginas os visitantes passam mais tempo."
          />
          <FeatureCard
            icon={<Gauge className="h-6 w-6" />}
            title="Engagement score"
            description="Uma pontuação por visitante que resume o quão engajado ele esteve."
          />
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            title="Resumo automático por IA"
            description="Cada documento ganha um resumo gerado automaticamente ao ser enviado."
          />
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Chat sobre o documento"
            description="Visitantes podem conversar com uma IA que conhece o conteúdo."
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="Insights em linguagem natural"
            description="Análises e sugestões de acompanhamento escritas em português claro."
          />
        </FeatureSection>

        <FeatureSection title="Equipe" tone="muted">
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Workspaces compartilhados"
            description="Convide sua equipe para um workspace e compartilhem documentos."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Papéis por membro"
            description="Owner, editor ou viewer — cada um com o acesso certo."
          />
          <FeatureCard
            icon={<Send className="h-6 w-6" />}
            title="Enviado por"
            description="Saiba sempre quem da equipe enviou cada documento."
          />
        </FeatureSection>

        <section className="mx-auto max-w-5xl px-4 py-20 sm:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Planos</h2>
            <p className="mt-2 text-muted-foreground">
              Comece de graça. Faça upgrade quando precisar de mais.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <PricingCard
              name="Free"
              price="Grátis"
              features={["10 documentos, 10 links ativos"]}
            />
            <PricingCard
              name="Pro"
              price="R$29/mês"
              features={[
                "Marca d'água, NDA, lista de emails, branding, engagement score, ilimitado",
              ]}
              highlighted
            />
            <PricingCard
              name="Business"
              price="R$99/mês"
              features={[
                "Marca d'água, NDA, lista de emails, branding, engagement score, ilimitado",
                "Workspaces em equipe",
              ]}
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function FeatureSection({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "muted";
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        tone === "muted" ? "bg-muted/40 py-16 sm:py-20" : "py-16 sm:py-20"
      }
    >
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      </div>
    </section>
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
    <Card className="border border-border shadow-none transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function PricingCard({
  name,
  price,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative border shadow-none",
        highlighted ? "border-primary shadow-md" : "border-border",
      )}
    >
      {highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-wide uppercase">
          Mais popular
        </Badge>
      )}
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <p className="text-3xl font-semibold">{price}</p>
        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className="mt-4"
          variant={highlighted ? "default" : "outline"}
          asChild
        >
          <Link href="/register">Começar agora</Link>
        </Button>
      </CardHeader>
    </Card>
  );
}
