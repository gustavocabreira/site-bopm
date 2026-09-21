import "server-only";
import { createSupabaseAdminClient } from "./supabase";
import type { Individuo } from "./boletimEstado";
import type { MaterialApreendido } from "./materiais";

export interface BoletimSalvo {
  id: string;
  discordUserId: string;
  discordUserName: string | null;
  rsoId: string | null;
  prefixo: string;
  chefeEquipe: string | null;
  motorista: string | null;
  homem3: string | null;
  homem4: string | null;
  local: string;
  veiculo: string | null;
  natureza: string;
  relato: string | null;
  artigos: string | null;
  data: string | null;
  horario: string | null;
  texto: string;
  individuos: Individuo[];
  materiais: MaterialApreendido[];
  /** Numero do BOPM no sistema oficial da cidade — nao existe na criacao, e informado pelo policial no fechamento do RSO. */
  numeroSistema: string | null;
  createdAt: string;
}

export interface NovoBoletim {
  discordUserId: string;
  discordUserName: string | null;
  rsoId: string;
  prefixo: string;
  chefeEquipe: string;
  motorista: string;
  homem3: string;
  homem4: string;
  local: string;
  veiculo: string;
  natureza: string;
  relato: string;
  artigos: string | null;
  data: string;
  horario: string;
  texto: string;
  individuos: Individuo[];
  materiais: MaterialApreendido[];
}

export async function saveBoletim(boletim: NovoBoletim): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("boletins").insert({
    discord_user_id: boletim.discordUserId,
    discord_user_name: boletim.discordUserName,
    rso_id: boletim.rsoId,
    prefixo: boletim.prefixo,
    chefe_equipe: boletim.chefeEquipe,
    motorista: boletim.motorista,
    homem3: boletim.homem3 || null,
    homem4: boletim.homem4 || null,
    local: boletim.local,
    veiculo: boletim.veiculo || null,
    natureza: boletim.natureza,
    relato: boletim.relato,
    artigos: boletim.artigos,
    data: boletim.data,
    horario: boletim.horario,
    texto: boletim.texto,
    individuos: boletim.individuos,
    materiais: boletim.materiais,
  });

  if (error) {
    throw new Error(`Falha ao salvar o boletim no banco: ${error.message}`);
  }
}

export interface AtualizacaoBoletim {
  prefixo?: string;
  chefeEquipe?: string;
  motorista?: string;
  homem3?: string;
  homem4?: string;
  local?: string;
  veiculo?: string;
  natureza?: string;
  relato?: string;
  artigos?: string | null;
  texto?: string;
  individuos?: Individuo[];
  materiais?: MaterialApreendido[];
}

const CAMPO_PARA_COLUNA: Record<keyof AtualizacaoBoletim, string> = {
  prefixo: "prefixo",
  chefeEquipe: "chefe_equipe",
  motorista: "motorista",
  homem3: "homem3",
  homem4: "homem4",
  local: "local",
  veiculo: "veiculo",
  natureza: "natureza",
  relato: "relato",
  artigos: "artigos",
  texto: "texto",
  individuos: "individuos",
  materiais: "materiais",
};

/** Atualiza um boletim ja confirmado (correcao pontual pos-publicacao) — qualquer campo estruturado e/ou o texto final. */
export async function updateBoletim(id: string, atualizacao: AtualizacaoBoletim): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};
  for (const [campo, coluna] of Object.entries(CAMPO_PARA_COLUNA) as [keyof AtualizacaoBoletim, string][]) {
    if (atualizacao[campo] !== undefined) patch[coluna] = atualizacao[campo];
  }

  const { error } = await supabase.from("boletins").update(patch).eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar o boletim no banco: ${error.message}`);
  }
}

/** Remove um boletim ja confirmado. */
export async function deleteBoletim(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("boletins").delete().eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir o boletim no banco: ${error.message}`);
  }
}

const SELECT_COLUMNS =
  "id, discord_user_id, discord_user_name, rso_id, prefixo, chefe_equipe, motorista, homem3, homem4, local, veiculo, natureza, relato, artigos, data, horario, texto, individuos, materiais, numero_sistema, created_at";

function mapRow(row: Record<string, unknown>): BoletimSalvo {
  return {
    id: row.id as string,
    discordUserId: row.discord_user_id as string,
    discordUserName: (row.discord_user_name as string | null) ?? null,
    rsoId: (row.rso_id as string | null) ?? null,
    prefixo: row.prefixo as string,
    chefeEquipe: (row.chefe_equipe as string | null) ?? null,
    motorista: (row.motorista as string | null) ?? null,
    homem3: (row.homem3 as string | null) ?? null,
    homem4: (row.homem4 as string | null) ?? null,
    local: row.local as string,
    veiculo: (row.veiculo as string | null) ?? null,
    natureza: row.natureza as string,
    relato: (row.relato as string | null) ?? null,
    artigos: (row.artigos as string | null) ?? null,
    data: (row.data as string | null) ?? null,
    horario: (row.horario as string | null) ?? null,
    texto: row.texto as string,
    individuos: (row.individuos as Individuo[] | null) ?? [],
    materiais: (row.materiais as MaterialApreendido[] | null) ?? [],
    numeroSistema: (row.numero_sistema as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listBoletins(limit = 100): Promise<BoletimSalvo[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("boletins")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map(mapRow);
}

/** Lista boletins confirmados dentro do periodo [from, to] (datas ISO), usado no relatorio agregado. */
export async function listBoletinsByPeriod(from: string, to: string): Promise<BoletimSalvo[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("boletins")
    .select(SELECT_COLUMNS)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map(mapRow);
}

/**
 * Grava o numero de cada BOPM no sistema oficial da cidade, informado pelo
 * policial no fechamento do RSO. Escopado ao rsoId para so poder gravar em
 * boletins que realmente pertencem a esse servico.
 */
export async function salvarNumerosSistema(rsoId: string, numeros: Record<string, string>): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const entradas = Object.entries(numeros).filter(([, numero]) => numero.trim().length > 0);

  await Promise.all(
    entradas.map(([boletimId, numero]) =>
      supabase.from("boletins").update({ numero_sistema: numero.trim() }).eq("id", boletimId).eq("rso_id", rsoId),
    ),
  );
}

/** Lista os boletins feitos dentro de um RSO especifico, usado na tela "em servico" e na apuracao de produtividade do fechamento. */
export async function listBoletinsByRso(rsoId: string): Promise<BoletimSalvo[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("boletins")
    .select(SELECT_COLUMNS)
    .eq("rso_id", rsoId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map(mapRow);
}
