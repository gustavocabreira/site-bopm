import { getServerSession } from "next-auth";
import Link from "next/link";
import { ShieldCheck, ListChecks, BarChart3 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";
import { BoletimForm } from "@/components/boletim-form";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getServerSession(authOptions);

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
            <Button variant="ghost" size="sm" className="gap-2" render={<Link href="/boletins" />}>
              <ListChecks className="size-4" />
              <span className="hidden sm:inline">Boletins</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" render={<Link href="/relatorios" />}>
              <BarChart3 className="size-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </Button>
            <UserMenu name={session?.user?.name} image={session?.user?.image} />
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-start p-4 sm:p-8">
        <BoletimForm />
      </main>
    </div>
  );
}
