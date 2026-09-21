import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listRsosByUser } from "@/lib/rsoStore";
import { MeusTurnosList } from "@/components/meus-turnos-list";

export const dynamic = "force-dynamic";

export default async function MeusTurnosPage() {
  const session = await getServerSession(authOptions);
  const rsos = session ? await listRsosByUser(session.user.id) : [];

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-lg font-semibold">Meus turnos</h1>
      <MeusTurnosList rsos={rsos} />
    </div>
  );
}
