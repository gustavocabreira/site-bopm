import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTurnosParaHeatmap } from "@/lib/rsoStore";
import { calcularHeatmapTurnos } from "@/lib/turnosHeatmap";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to || !DATA_REGEX.test(from) || !DATA_REGEX.test(to)) {
    return NextResponse.json({ error: "Informe as datas de início e fim no formato AAAA-MM-DD." }, { status: 400 });
  }

  // Horario de Sao Paulo (UTC-3) fixo, sem horario de verao.
  const de = `${from}T00:00:00-03:00`;
  const ate = `${to}T23:59:59-03:00`;

  const turnos = await listTurnosParaHeatmap({ de, ate });
  const matriz = calcularHeatmapTurnos(turnos);
  return NextResponse.json({ matriz });
}
