import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AbrirRsoForm } from "@/components/abrir-rso-form";
import { ServicoAtivo } from "@/components/servico-ativo";
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
    <main className="flex flex-1 items-start p-4 sm:p-8">
      {rso ? (
        <ServicoAtivo rso={rso} boletins={boletins} remodulacoes={remodulacoes} />
      ) : (
        <div className="flex w-full justify-center">
          <AbrirRsoForm />
        </div>
      )}
    </main>
  );
}
