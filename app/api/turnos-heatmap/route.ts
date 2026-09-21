import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTurnosParaHeatmap } from "@/lib/rsoStore";
import { calcularHeatmapTurnos } from "@/lib/turnosHeatmap";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const turnos = await listTurnosParaHeatmap();
  const matriz = calcularHeatmapTurnos(turnos);
  return NextResponse.json({ matriz });
}
