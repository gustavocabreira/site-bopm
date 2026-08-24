import "server-only";
import { createSupabaseAdminClient } from "./supabase";

export interface BoletimSalvo {
  id: string;
  discordUserId: string;
  discordUserName: string | null;
  prefixo: string;
  local: string;
  natureza: string;
  texto: string;
  createdAt: string;
}

export interface NovoBoletim {
  discordUserId: string;
  discordUserName: string | null;
  prefixo: string;
  local: string;
  natureza: string;
  texto: string;
}

export async function saveBoletim(boletim: NovoBoletim): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("boletins").insert({
    discord_user_id: boletim.discordUserId,
    discord_user_name: boletim.discordUserName,
    prefixo: boletim.prefixo,
    local: boletim.local,
    natureza: boletim.natureza,
    texto: boletim.texto,
  });
}

export async function listBoletins(limit = 100): Promise<BoletimSalvo[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("boletins")
    .select("id, discord_user_id, discord_user_name, prefixo, local, natureza, texto, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    discordUserId: row.discord_user_id,
    discordUserName: row.discord_user_name,
    prefixo: row.prefixo,
    local: row.local,
    natureza: row.natureza,
    texto: row.texto,
    createdAt: row.created_at,
  }));
}
