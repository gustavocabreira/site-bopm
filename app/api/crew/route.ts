import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLastCrew, saveCrew } from "@/lib/crewStore";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const crew = await getLastCrew(session.user.id);
  return NextResponse.json({ crew });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const { prefixo, chefeEquipe, motorista, homem3, homem4 } = body ?? {};

  if (!prefixo || !chefeEquipe || !motorista) {
    return NextResponse.json({ error: "Prefixo, chefe de equipe e motorista são obrigatórios." }, { status: 400 });
  }

  await saveCrew(session.user.id, {
    prefixo,
    chefeEquipe,
    motorista,
    homem3: homem3 ?? "",
    homem4: homem4 ?? "",
  });

  return NextResponse.json({ ok: true });
}
