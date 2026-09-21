import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBoletinsByRso } from "@/lib/boletimStore";
import { createRso, getOpenRso, getOpenRsoParaUsuario, listRemodulacoes } from "@/lib/rsoStore";
import type { TipoViatura } from "@/lib/rsoEstado";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rso = await getOpenRsoParaUsuario(session.user.id);
  if (!rso) {
    return NextResponse.json({ rso: null, boletins: [], remodulacoes: [] });
  }

  const [boletins, remodulacoes] = await Promise.all([listBoletinsByRso(rso.id), listRemodulacoes(rso.id)]);
  return NextResponse.json({ rso, boletins, remodulacoes });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const jaAberto = await getOpenRso(session.user.id);
  if (jaAberto) {
    return NextResponse.json({ error: "Você já tem um serviço em aberto." }, { status: 409 });
  }

  const body = await request.json();
  const {
    tipo,
    turno,
    viatura,
    prefixo,
    chefeEquipe,
    motorista,
    homem3,
    homem4,
    r1Encarregado,
    r2ApoioTatico,
    r3Interventor,
  } = body ?? {};

  if (tipo !== "quatro_rodas" && tipo !== "rocam") {
    return NextResponse.json({ error: "Tipo de viatura inválido." }, { status: 400 });
  }
  if (!turno || !viatura || !prefixo) {
    return NextResponse.json({ error: "Turno, viatura e prefixo são obrigatórios." }, { status: 400 });
  }
  if (tipo === "quatro_rodas" && (!chefeEquipe || !motorista)) {
    return NextResponse.json({ error: "Chefe da equipe e motorista são obrigatórios." }, { status: 400 });
  }
  if (tipo === "rocam" && (!r1Encarregado || !r2ApoioTatico)) {
    return NextResponse.json({ error: "R1 e R2 são obrigatórios." }, { status: 400 });
  }

  try {
    const rso = await createRso({
      discordUserId: session.user.id,
      discordUserName: session.user.name ?? null,
      tipo: tipo as TipoViatura,
      turno,
      viatura,
      prefixo,
      chefeEquipe,
      motorista,
      homem3,
      homem4,
      r1Encarregado,
      r2ApoioTatico,
      r3Interventor,
    });
    return NextResponse.json({ rso });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: message.includes("já tem") ? 409 : 502 });
  }
}
