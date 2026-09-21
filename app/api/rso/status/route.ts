import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOpenRsoParaUsuario } from "@/lib/rsoStore";

/**
 * Versão leve de GET /api/rso, só com o horário de início do RSO aberto —
 * usada pelo badge "em serviço" do header, que não precisa da lista de
 * boletins/remodulações e não deve pagar o custo dessas consultas extras
 * em toda página.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ iniciadoEm: null });
  }

  const rso = await getOpenRsoParaUsuario(session.user.id);
  return NextResponse.json({ iniciadoEm: rso?.iniciadoEm ?? null });
}
