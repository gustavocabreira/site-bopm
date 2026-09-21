import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revisarRso } from "@/lib/rsoGenerator";
import type { EstadoRso } from "@/lib/rsoEstado";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const estadoAtual: EstadoRso | undefined = body?.estadoAtual;
  const instrucao: string | undefined = body?.instrucao;

  if (!estadoAtual || !instrucao || !instrucao.trim()) {
    return NextResponse.json({ error: "Estado atual e instrução são obrigatórios." }, { status: 400 });
  }

  try {
    const estadoAtualizado = await revisarRso(estadoAtual, instrucao);
    return NextResponse.json(estadoAtualizado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
