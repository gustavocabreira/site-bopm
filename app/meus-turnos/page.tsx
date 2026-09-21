import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listRsosByUser } from "@/lib/rsoStore";
import { MeusTurnosList } from "@/components/meus-turnos-list";
import { StatusServicoBadge } from "@/components/status-servico-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MeusTurnosPage() {
  const session = await getServerSession(authOptions);
  const rsos = session ? await listRsosByUser(session.user.id) : [];

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Meus turnos</h1>
        <StatusServicoBadge />
      </div>
      <MeusTurnosList rsos={rsos} />
    </div>
  );
}
