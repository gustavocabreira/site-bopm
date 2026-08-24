import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revisarBoletim } from "@/lib/relatoGenerator";
import type { EstadoBoletim } from "@/lib/boletimEstado";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const estadoAtual: EstadoBoletim | undefined = body?.estadoAtual;
  const instrucao: string | undefined = body?.instrucao;

  if (!estadoAtual || !instrucao || !instrucao.trim()) {
    return NextResponse.json({ error: "Estado atual e instrução são obrigatórios." }, { status: 400 });
  }

  try {
    const estadoAtualizado = await revisarBoletim(estadoAtual, instrucao);
    return NextResponse.json(estadoAtualizado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
