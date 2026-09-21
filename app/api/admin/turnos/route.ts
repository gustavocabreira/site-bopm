import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminUser } from "@/lib/auth";
import { listRsosAdmin, type FiltrosRsoAdmin } from "@/lib/rsoStore";
import { listBoletinsByRso } from "@/lib/boletimStore";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdminUser(session.user.id)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const policial = searchParams.get("policial")?.trim() || undefined;

  const filtros: FiltrosRsoAdmin = {};
  if (status === "aberto" || status === "fechado") filtros.status = status;
  if (from && DATA_REGEX.test(from)) filtros.de = `${from}T00:00:00-03:00`;
  if (to && DATA_REGEX.test(to)) filtros.ate = `${to}T23:59:59-03:00`;
  if (policial) filtros.discordUserId = policial;

  const rsos = await listRsosAdmin(filtros);
  const turnos = await Promise.all(
    rsos.map(async (rso) => ({ ...rso, boletins: await listBoletinsByRso(rso.id) })),
  );

  return NextResponse.json({ turnos });
}
