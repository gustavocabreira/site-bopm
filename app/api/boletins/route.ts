import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBoletins, saveBoletim } from "@/lib/boletimStore";
import { getOpenRsoParaUsuario } from "@/lib/rsoStore";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const boletins = await listBoletins();
  return NextResponse.json({ boletins });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const {
    prefixo,
    chefeEquipe,
    motorista,
    homem3,
    homem4,
    local,
    veiculo,
    natureza,
    relato,
    artigos,
    data,
    horario,
    texto,
    individuos,
    materiais,
  } = body ?? {};

  if (!prefixo || !local || !natureza || !texto || !relato || !data || !horario) {
    return NextResponse.json({ error: "Dados incompletos para salvar o boletim." }, { status: 400 });
  }

  const rso = await getOpenRsoParaUsuario(session.user.id);
  if (!rso) {
    return NextResponse.json(
      { error: "Nenhum serviço em aberto — abra um RSO (ou entre na guarnição de um) antes de gerar o boletim." },
      { status: 409 },
    );
  }

  try {
    await saveBoletim({
      discordUserId: session.user.id,
      discordUserName: session.user.name ?? null,
      rsoId: rso.id,
      prefixo,
      chefeEquipe: chefeEquipe ?? "",
      motorista: motorista ?? "",
      homem3: homem3 ?? "",
      homem4: homem4 ?? "",
      local,
      veiculo: veiculo ?? "",
      natureza,
      relato,
      artigos: artigos ?? null,
      data,
      horario,
      texto,
      individuos: Array.isArray(individuos) ? individuos : [],
      materiais: Array.isArray(materiais) ? materiais : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
