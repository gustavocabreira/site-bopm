import "server-only";
import { createSupabaseAdminClient } from "./supabase";
import type { Individuo } from "./boletimEstado";
import type { MaterialApreendido } from "./materiais";

export interface BoletimSalvo {
  id: string;
  discordUserId: string;
  discordUserName: string | null;
  prefixo: string;
  chefeEquipe: string | null;
  local: string;
  natureza: string;
  texto: string;
  individuos: Individuo[];
  materiais: MaterialApreendido[];
  createdAt: string;
}

export interface NovoBoletim {
  discordUserId: string;
  discordUserName: string | null;
  prefixo: string;
  chefeEquipe: string;
  local: string;
  natureza: string;
  texto: string;
  individuos: Individuo[];
  materiais: MaterialApreendido[];
}

export async function saveBoletim(boletim: NovoBoletim): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("boletins").insert({
    discord_user_id: boletim.discordUserId,
    discord_user_name: boletim.discordUserName,
    prefixo: boletim.prefixo,
    chefe_equipe: boletim.chefeEquipe,
    local: boletim.local,
    natureza: boletim.natureza,
    texto: boletim.texto,
    individuos: boletim.individuos,
    materiais: boletim.materiais,
  });
}

const SELECT_COLUMNS =
  "id, discord_user_id, discord_user_name, prefixo, chefe_equipe, local, natureza, texto, individuos, materiais, created_at";

function mapRow(row: Record<string, unknown>): BoletimSalvo {
  return {
    id: row.id as string,
    discordUserId: row.discord_user_id as string,
    discordUserName: (row.discord_user_name as string | null) ?? null,
    prefixo: row.prefixo as string,
    chefeEquipe: (row.chefe_equipe as string | null) ?? null,
    local: row.local as string,
    natureza: row.natureza as string,
    texto: row.texto as string,
    individuos: (row.individuos as Individuo[] | null) ?? [],
    materiais: (row.materiais as MaterialApreendido[] | null) ?? [],
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
