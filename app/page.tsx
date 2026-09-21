import { getServerSession } from "next-auth";
import Link from "next/link";
import { ShieldCheck, ListChecks, BarChart3, CalendarClock } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";
import { AbrirRsoForm } from "@/components/abrir-rso-form";
import { ServicoAtivo } from "@/components/servico-ativo";
import { Button } from "@/components/ui/button";
import { listBoletinsByRso } from "@/lib/boletimStore";
import { getOpenRsoParaUsuario, listRemodulacoes } from "@/lib/rsoStore";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const rso = session ? await getOpenRsoParaUsuario(session.user.id) : null;
  const [boletins, remodulacoes] = rso
    ? await Promise.all([listBoletinsByRso(rso.id), listRemodulacoes(rso.id)])
    : [[], []];

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-4 py-3.5 backdrop-blur-md sm:px-8">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <ShieldCheck className="size-4.5" strokeWidth={1.75} />
            </div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Boletim de Ocorrência
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              nativeButton={false}
              render={<Link href="/meus-turnos" />}
            >
              <CalendarClock className="size-4" />
              <span className="hidden sm:inline">Meus turnos</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" nativeButton={false} render={<Link href="/boletins" />}>
              <ListChecks className="size-4" />
              <span className="hidden sm:inline">Boletins</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              nativeButton={false}
              render={<Link href="/relatorios" />}
            >
              <BarChart3 className="size-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </Button>
            <UserMenu name={session?.user?.name} image={session?.user?.image} />
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-start p-4 sm:p-8">
        {rso ? (
          <ServicoAtivo rso={rso} boletins={boletins} remodulacoes={remodulacoes} />
        ) : (
          <div className="flex w-full justify-center">
            <AbrirRsoForm />
          </div>
        )}
      </main>
    </div>
  );
}
