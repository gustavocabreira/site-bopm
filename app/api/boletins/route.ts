import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBoletins, saveBoletim } from "@/lib/boletimStore";

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
  const { prefixo, local, natureza, texto } = body ?? {};

  if (!prefixo || !local || !natureza || !texto) {
    return NextResponse.json({ error: "Dados incompletos para salvar o boletim." }, { status: 400 });
  }

  await saveBoletim({
    discordUserId: session.user.id,
    discordUserName: session.user.name ?? null,
    prefixo,
    local,
    natureza,
    texto,
  });

  return NextResponse.json({ ok: true });
}
