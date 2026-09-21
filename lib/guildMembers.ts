import "server-only";
import { createSupabaseAdminClient } from "./supabase";
import type { MembroGuilda } from "./membroGuilda";

export type { MembroGuilda };

/** Guilda cujos membros alimentam o autocomplete de nomes ao abrir RSO e remodular. */
export const GUILD_MEMBERS_GUILD_ID = "1508576481696284933";

/** Só membros com esse cargo entram no autocomplete (ex.: só policiais, não visitantes/civis). */
export const GUILD_MEMBERS_ROLE_ID = "1517238629410541608";

const collatorNomes = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

/**
 * Lê o cache de membros da guilda, ordenado alfabeticamente (comparação
 * localizada — trata acento/maiúscula como a ordenação alfabética normal,
 * ao contrário da colação padrão do banco). Não bate na API do Discord:
 * uma falha ou tabela vazia só faz o autocomplete voltar pro fallback de
 * digitação livre no formulário. O cache é atualizado sob demanda por
 * sincronizarMembrosGuilda (ver botão "Sincronizar membros" no formulário).
 */
export async function listarMembrosGuilda(): Promise<MembroGuilda[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guild_members")
    .select("discord_user_id, nome")
    .eq("guild_id", GUILD_MEMBERS_GUILD_ID)
    .eq("is_bot", false);

  if (error || !data) return [];

  return data
    .map((row) => ({ id: row.discord_user_id as string, nome: row.nome as string }))
    .sort((a, b) => collatorNomes.compare(a.nome, b.nome));
}

interface DiscordGuildMember {
  user: { id: string; username: string; global_name: string | null; bot?: boolean };
  nick: string | null;
  roles: string[];
}

/** Nome de exibição do membro, no mesmo critério usado no login (ver fetchGuildMember em lib/auth.ts). */
function nomeExibicao(member: DiscordGuildMember): string {
  return member.nick ?? member.user.global_name ?? member.user.username;
}

async function buscarTodosOsMembros(botToken: string): Promise<DiscordGuildMember[]> {
  const membros: DiscordGuildMember[] = [];
  let after = "0";

  for (;;) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_MEMBERS_GUILD_ID}/members?limit=1000&after=${after}`,
      { headers: { Authorization: `Bot ${botToken}` } },
    );
    if (!res.ok) throw new Error(`Discord API respondeu ${res.status} ao listar membros da guilda.`);

    const pagina: DiscordGuildMember[] = await res.json();
    membros.push(...pagina);
    if (pagina.length < 1000) break;
    after = pagina[pagina.length - 1].user.id;
  }

  return membros;
}

/**
 * Sincroniza sob demanda o cache de membros com a API do Discord: busca
 * todos os membros da guilda, grava/atualiza quem tem o cargo configurado
 * e remove do cache quem não tem mais (ou saiu). Sem processo persistente
 * (bot rodando 24/7) não dá pra reagir a eventos em tempo real, então essa
 * função é chamada sob demanda — pelo botão "Sincronizar membros" no
 * formulário de abrir RSO / remodulação.
 */
export async function sincronizarMembrosGuilda(): Promise<{ total: number; comCargo: number }> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN não configurado.");

  const membros = await buscarTodosOsMembros(botToken);
  const comCargo = membros.filter((member) => member.roles.includes(GUILD_MEMBERS_ROLE_ID));

  const supabase = createSupabaseAdminClient();

  if (comCargo.length > 0) {
    const linhas = comCargo.map((member) => ({
      guild_id: GUILD_MEMBERS_GUILD_ID,
      discord_user_id: member.user.id,
      nome: nomeExibicao(member),
      is_bot: member.user.bot ?? false,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("guild_members").upsert(linhas, { onConflict: "guild_id,discord_user_id" });
    if (error) throw new Error(`Falha ao gravar membros: ${error.message}`);
  }

  const idsComCargo = comCargo.map((member) => member.user.id);
  const { data: cache, error: erroCache } = await supabase
    .from("guild_members")
    .select("discord_user_id")
    .eq("guild_id", GUILD_MEMBERS_GUILD_ID);

  if (!erroCache && cache) {
    const paraRemover = cache.map((row) => row.discord_user_id as string).filter((id) => !idsComCargo.includes(id));
    if (paraRemover.length > 0) {
      const { error: erroRemocao } = await supabase
        .from("guild_members")
        .delete()
        .eq("guild_id", GUILD_MEMBERS_GUILD_ID)
        .in("discord_user_id", paraRemover);
      if (erroRemocao) throw new Error(`Falha ao remover membros sem o cargo: ${erroRemocao.message}`);
    }
  }

  return { total: membros.length, comCargo: comCargo.length };
}
