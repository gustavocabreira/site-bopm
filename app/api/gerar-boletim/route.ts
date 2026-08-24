import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { gerarConteudoOcorrencia } from "@/lib/relatoGenerator";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const relatoBruto: string | undefined = body?.relatoBruto;

  if (!relatoBruto || !relatoBruto.trim()) {
    return NextResponse.json({ error: "O relato não pode ser vazio." }, { status: 400 });
  }

  try {
    const conteudo = await gerarConteudoOcorrencia(relatoBruto);
    return NextResponse.json(conteudo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
