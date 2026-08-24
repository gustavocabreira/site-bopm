import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { complementarConteudoOcorrencia } from "@/lib/relatoGenerator";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const relatoAtual: string | undefined = body?.relatoAtual;
  const complemento: string | undefined = body?.complemento;

  if (!relatoAtual || !complemento || !complemento.trim()) {
    return NextResponse.json({ error: "Relato atual e complemento são obrigatórios." }, { status: 400 });
  }

  try {
    const conteudo = await complementarConteudoOcorrencia(relatoAtual, complemento);
    return NextResponse.json(conteudo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
