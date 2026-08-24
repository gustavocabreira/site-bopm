import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBoletinsByPeriod } from "@/lib/boletimStore";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface MaterialAgregado {
  categoria: string;
  unidade: string;
  quantidadeTotal: number;
  ocorrencias: number;
}

interface RankingPolicial {
  chefeEquipe: string;
  totalPresos: number;
  totalBoletins: number;
}

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
  const fromISO = `${from}T00:00:00-03:00`;
  const toISO = `${to}T23:59:59-03:00`;

  const boletins = await listBoletinsByPeriod(fromISO, toISO);

  const individuos = boletins.flatMap((boletim) =>
    boletim.individuos
      .filter((individuo) => individuo.nome.trim().length > 0)
      .map((individuo) => ({
        nome: individuo.nome,
        rg: individuo.rg,
        boletimId: boletim.id,
        prefixo: boletim.prefixo,
        local: boletim.local,
        createdAt: boletim.createdAt,
      })),
  );

  const materiaisPorChave = new Map<string, MaterialAgregado>();
  for (const boletim of boletins) {
    for (const material of boletim.materiais) {
      const chave = `${material.categoria}::${material.unidade}`;
      const atual = materiaisPorChave.get(chave);
      if (atual) {
        atual.quantidadeTotal += material.quantidade;
        atual.ocorrencias += 1;
      } else {
        materiaisPorChave.set(chave, {
          categoria: material.categoria,
          unidade: material.unidade,
          quantidadeTotal: material.quantidade,
          ocorrencias: 1,
        });
      }
    }
  }

  const materiaisAgregados = [...materiaisPorChave.values()].sort((a, b) =>
    a.categoria === b.categoria ? b.quantidadeTotal - a.quantidadeTotal : a.categoria.localeCompare(b.categoria),
  );

  const rankingPorChefe = new Map<string, RankingPolicial>();
  for (const boletim of boletins) {
    const chefeEquipe = boletim.chefeEquipe?.trim();
    if (!chefeEquipe) continue;

    const atual = rankingPorChefe.get(chefeEquipe);
    const presosNesteBoletim = boletim.individuos.filter((individuo) => individuo.nome.trim().length > 0).length;
    if (atual) {
      atual.totalPresos += presosNesteBoletim;
      atual.totalBoletins += 1;
    } else {
      rankingPorChefe.set(chefeEquipe, { chefeEquipe, totalPresos: presosNesteBoletim, totalBoletins: 1 });
    }
  }

  const rankingPrisoes = [...rankingPorChefe.values()].sort((a, b) => b.totalPresos - a.totalPresos);

  return NextResponse.json({
    totalBoletins: boletins.length,
    individuos,
    materiaisAgregados,
    rankingPrisoes,
  });
}
