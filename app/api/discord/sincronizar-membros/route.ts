import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminUser } from "@/lib/auth";
import { sincronizarMembrosGuilda } from "@/lib/guildMembers";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdminUser(session.user.id)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const resultado = await sincronizarMembrosGuilda();
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
