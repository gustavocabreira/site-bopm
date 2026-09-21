import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarMembrosGuilda } from "@/lib/guildMembers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const membros = await listarMembrosGuilda();
  return NextResponse.json({ membros });
}
