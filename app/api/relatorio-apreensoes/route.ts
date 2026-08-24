import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBoletinsByPeriod, type BoletimSalvo } from "@/lib/boletimStore";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface MaterialAgregado {
  categoria: string;
  unidade: string;
  quantidadeTotal: number;
  ocorrencias: number;
}

interface RankingPolicial {
  policial: string;
  totalPresos: number;
  totalBoletins: number;
}

function integrantesDoBoletim(boletim: BoletimSalvo): string[] {
  return [boletim.chefeEquipe, boletim.motorista, boletim.homem3, boletim.homem4]
    .map((nome) => nome?.trim())
    .filter((nome): nome is string => Boolean(nome));
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const policialFiltro = searchParams.get("policial")?.trim() || null;

  if (!from || !to || !DATA_REGEX.test(from) || !DATA_REGEX.test(to)) {
    return NextResponse.json({ error: "Informe as datas de início e fim no formato AAAA-MM-DD." }, { status: 400 });
  }

  // Horario de Sao Paulo (UTC-3) fixo, sem horario de verao.
  const fromISO = `${from}T00:00:00-03:00`;
  const toISO = `${to}T23:59:59-03:00`;

  const boletinsPeriodo = await listBoletinsByPeriod(fromISO, toISO);

  const todosPoliciais = [...new Set(boletinsPeriodo.flatMap(integrantesDoBoletim))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  const boletins = policialFiltro
    ? boletinsPeriodo.filter((boletim) => integrantesDoBoletim(boletim).includes(policialFiltro))
    : boletinsPeriodo;

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

  const rankingPorPolicial = new Map<string, RankingPolicial>();
  for (const boletim of boletins) {
    const presosNesteBoletim = boletim.individuos.filter((individuo) => individuo.nome.trim().length > 0).length;

    for (const policial of new Set(integrantesDoBoletim(boletim))) {
      const atual = rankingPorPolicial.get(policial);
      if (atual) {
        atual.totalPresos += presosNesteBoletim;
        atual.totalBoletins += 1;
      } else {
        rankingPorPolicial.set(policial, { policial, totalPresos: presosNesteBoletim, totalBoletins: 1 });
      }
    }
  }

  const rankingPrisoes = [...rankingPorPolicial.values()].sort((a, b) => b.totalPresos - a.totalPresos);

  const ocorrenciasPorCategoria = new Map<string, number>();
  for (const boletim of boletins) {
    for (const material of boletim.materiais) {
      ocorrenciasPorCategoria.set(material.categoria, (ocorrenciasPorCategoria.get(material.categoria) ?? 0) + 1);
    }
  }
  const categoriasOrdenadas = [...ocorrenciasPorCategoria.entries()].sort((a, b) => b[1] - a[1]);
  const top3Categorias = categoriasOrdenadas.slice(0, 3).map(([categoria, total]) => ({ categoria, total }));
  const restante = categoriasOrdenadas.slice(3).reduce((soma, [, total]) => soma + total, 0);
  const topCategorias = restante > 0 ? [...top3Categorias, { categoria: "Outros", total: restante }] : top3Categorias;

  return NextResponse.json({
    totalBoletins: boletins.length,
    individuos,
    materiaisAgregados,
    rankingPrisoes,
    topCategorias,
    todosPoliciais,
  });
}
