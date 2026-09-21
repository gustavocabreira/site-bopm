import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRsoById, registrarRemodulacao } from "@/lib/rsoStore";
import type { CrewSnapshot } from "@/lib/rsoEstado";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const rso = await getRsoById(id);
  if (!rso || rso.discordUserId !== session.user.id) {
    return NextResponse.json({ error: "RSO não encontrado." }, { status: 404 });
  }
  if (rso.encerradoEm) {
    return NextResponse.json({ error: "Este RSO já foi encerrado." }, { status: 409 });
  }

  const body = await request.json();
  const { chefeEquipe, motorista, homem3, homem4, r1Encarregado, r2ApoioTatico, r3Interventor } = body ?? {};

  if (rso.tipo === "quatro_rodas" && (!chefeEquipe || !motorista)) {
    return NextResponse.json({ error: "Chefe da equipe e motorista são obrigatórios." }, { status: 400 });
  }
  if (rso.tipo === "rocam" && (!r1Encarregado || !r2ApoioTatico)) {
    return NextResponse.json({ error: "R1 e R2 são obrigatórios." }, { status: 400 });
  }

  const integrantesNovos: CrewSnapshot = {
    chefeEquipe: chefeEquipe ?? "",
    motorista: motorista ?? "",
    homem3: homem3 ?? "",
    homem4: homem4 ?? "",
    r1Encarregado: r1Encarregado ?? "",
    r2ApoioTatico: r2ApoioTatico ?? "",
    r3Interventor: r3Interventor ?? "",
  };

  try {
    const remodulacao = await registrarRemodulacao(rso, integrantesNovos);
    return NextResponse.json({ remodulacao });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
