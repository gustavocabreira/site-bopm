import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { closeRso, getRsoById, pertenceAGuarnicao } from "@/lib/rsoStore";
import { listBoletinsByRso, salvarNumerosSistema } from "@/lib/boletimStore";
import type { EstadoRso } from "@/lib/rsoEstado";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const rso = await getRsoById(id);
  if (!rso || !pertenceAGuarnicao(rso, session.user.id)) {
    return NextResponse.json({ error: "RSO não encontrado." }, { status: 404 });
  }
  if (rso.encerradoEm) {
    return NextResponse.json({ error: "Este RSO já foi encerrado." }, { status: 409 });
  }

  const body = await request.json();
  const estado: EstadoRso | undefined = body?.estado;
  const texto: string | undefined = body?.texto;
  const numerosBopm: Record<string, string> | undefined = body?.numerosBopm;

  if (!estado || !texto || !texto.trim()) {
    return NextResponse.json({ error: "Estado e texto final são obrigatórios." }, { status: 400 });
  }

  const boletins = await listBoletinsByRso(id);
  const faltando = boletins.some((boletim) => !numerosBopm?.[boletim.id]?.trim());
  if (faltando) {
    return NextResponse.json(
      { error: "Informe o número no sistema de todos os BOPMs antes de fechar o serviço." },
      { status: 400 },
    );
  }

  try {
    if (numerosBopm && Object.keys(numerosBopm).length > 0) {
      await salvarNumerosSistema(id, numerosBopm);
    }
    await closeRso(id, { estado, texto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
