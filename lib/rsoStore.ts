import "server-only";
import { createSupabaseAdminClient } from "./supabase";
import type { CrewSnapshot, EstadoRso, Remodulacao, TipoViatura } from "./rsoEstado";
import type { ProdutividadeRso } from "./rsoProdutividade";

export interface RsoSalvo {
  id: string;
  discordUserId: string;
  discordUserName: string | null;
  tipo: TipoViatura;
  turno: string;
  viatura: string;
  prefixo: string;
  chefeEquipe: string;
  motorista: string;
  homem3: string;
  homem4: string;
  r1Encarregado: string;
  r2ApoioTatico: string;
  r3Interventor: string;
  iniciadoEm: string;
  encerradoEm: string | null;
  produtividade: ProdutividadeRso | null;
  textoFechamento: string | null;
}

export interface NovoRso {
  discordUserId: string;
  discordUserName: string | null;
  tipo: TipoViatura;
  turno: string;
  viatura: string;
  prefixo: string;
  chefeEquipe?: string;
  motorista?: string;
  homem3?: string;
  homem4?: string;
  r1Encarregado?: string;
  r2ApoioTatico?: string;
  r3Interventor?: string;
}

const SELECT_COLUMNS =
  "id, discord_user_id, discord_user_name, tipo, turno, viatura, prefixo, chefe_equipe, motorista, homem3, homem4, r1_encarregado, r2_apoio_tatico, r3_interventor, iniciado_em, encerrado_em, produtividade, texto_fechamento";

function mapRow(row: Record<string, unknown>): RsoSalvo {
  return {
    id: row.id as string,
    discordUserId: row.discord_user_id as string,
    discordUserName: (row.discord_user_name as string | null) ?? null,
    tipo: row.tipo as TipoViatura,
    turno: (row.turno as string | null) ?? "",
    viatura: (row.viatura as string | null) ?? "",
    prefixo: row.prefixo as string,
    chefeEquipe: (row.chefe_equipe as string | null) ?? "",
    motorista: (row.motorista as string | null) ?? "",
    homem3: (row.homem3 as string | null) ?? "",
    homem4: (row.homem4 as string | null) ?? "",
    r1Encarregado: (row.r1_encarregado as string | null) ?? "",
    r2ApoioTatico: (row.r2_apoio_tatico as string | null) ?? "",
    r3Interventor: (row.r3_interventor as string | null) ?? "",
    iniciadoEm: row.iniciado_em as string,
    encerradoEm: (row.encerrado_em as string | null) ?? null,
    produtividade: (row.produtividade as ProdutividadeRso | null) ?? null,
    textoFechamento: (row.texto_fechamento as string | null) ?? null,
  };
}

/** Retorna o RSO em aberto do usuário, ou null se não houver nenhum. */
export async function getOpenRso(discordUserId: string): Promise<RsoSalvo | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("rsos")
    .select(SELECT_COLUMNS)
    .eq("discord_user_id", discordUserId)
    .is("encerrado_em", null)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

/**
 * Retorna o RSO em aberto relevante para o usuário logado: o dele próprio
 * (quem abriu o serviço), se houver, senão o primeiro RSO em aberto de
 * OUTRA pessoa em que o ID da conta do Discord do usuário aparece na
 * guarnição — permite que qualquer integrante da equipe emita BOPM pelo
 * serviço, não só quem abriu. Guarnição é sempre marcada pelo ID da conta
 * (nunca nome como texto puro), por isso a comparação é direta e não muda
 * se a pessoa trocar de apelido. Fechar também é liberado a qualquer
 * integrante da guarnição (ver pertenceAGuarnicao); remodular continua
 * restrito a quem abriu (ver checagem de discordUserId na rota correspondente).
 */
export async function getOpenRsoParaUsuario(discordUserId: string): Promise<RsoSalvo | null> {
  const proprio = await getOpenRso(discordUserId);
  if (proprio) return proprio;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("rsos").select(SELECT_COLUMNS).is("encerrado_em", null);
  if (error || !data) return null;

  const rsoDaEquipe = data
    .map(mapRow)
    .find((rso) =>
      [rso.chefeEquipe, rso.motorista, rso.homem3, rso.homem4, rso.r1Encarregado, rso.r2ApoioTatico, rso.r3Interventor].includes(
        discordUserId,
      ),
    );

  return rsoDaEquipe ?? null;
}

/** Verdadeiro se o usuário abriu o RSO ou faz parte da guarnição atual — usado para liberar o fechamento pra qualquer integrante da equipe, não só quem abriu. */
export function pertenceAGuarnicao(rso: RsoSalvo, discordUserId: string): boolean {
  return (
    rso.discordUserId === discordUserId ||
    [rso.chefeEquipe, rso.motorista, rso.homem3, rso.homem4, rso.r1Encarregado, rso.r2ApoioTatico, rso.r3Interventor].includes(
      discordUserId,
    )
  );
}

/** Lista os RSOs (abertos e encerrados) que o usuário abriu, mais recentes primeiro — usado na aba "Meus turnos". */
export async function listRsosByUser(discordUserId: string, limit = 100): Promise<RsoSalvo[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("rsos")
    .select(SELECT_COLUMNS)
    .eq("discord_user_id", discordUserId)
    .order("iniciado_em", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapRow);
}

export interface FiltrosRsoAdmin {
  status?: "aberto" | "fechado";
  /** Data inicial (inclusive), ISO, comparado com iniciado_em. */
  de?: string;
  /** Data final (inclusive), ISO, comparado com iniciado_em. */
  ate?: string;
  /** ID Discord de um integrante da guarnição (qualquer posto) ou de quem abriu o RSO. */
  discordUserId?: string;
}

const POSTOS_GUARNICAO = [
  "discord_user_id",
  "chefe_equipe",
  "motorista",
  "homem3",
  "homem4",
  "r1_encarregado",
  "r2_apoio_tatico",
  "r3_interventor",
];

/** Lista RSOs (abertos e/ou encerrados) para a tela de supervisão administrativa, mais recentes primeiro. */
export async function listRsosAdmin(filtros: FiltrosRsoAdmin = {}, limit = 300): Promise<RsoSalvo[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("rsos").select(SELECT_COLUMNS);

  if (filtros.status === "aberto") query = query.is("encerrado_em", null);
  if (filtros.status === "fechado") query = query.not("encerrado_em", "is", null);
  if (filtros.de) query = query.gte("iniciado_em", filtros.de);
  if (filtros.ate) query = query.lte("iniciado_em", filtros.ate);
  if (filtros.discordUserId) {
    query = query.or(POSTOS_GUARNICAO.map((coluna) => `${coluna}.eq.${filtros.discordUserId}`).join(","));
  }

  const { data, error } = await query.order("iniciado_em", { ascending: false }).limit(limit);

  if (error) console.error("listRsosAdmin:", error.message);
  if (error || !data) return [];
  return data.map(mapRow);
}

/** Só início/fim de todos os RSOs (aberto ou não), para o mapa de calor de dia/horário — não precisa dos demais campos. */
export async function listTurnosParaHeatmap(): Promise<{ iniciadoEm: string; encerradoEm: string | null }[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("rsos").select("iniciado_em, encerrado_em");

  if (error || !data) return [];
  return data.map((row) => ({
    iniciadoEm: row.iniciado_em as string,
    encerradoEm: (row.encerrado_em as string | null) ?? null,
  }));
}

export async function getRsoById(id: string): Promise<RsoSalvo | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("rsos").select(SELECT_COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

/** Abre um novo RSO. Se o usuário já tiver um em aberto, o índice único no banco rejeita o insert. */
export async function createRso(dados: NovoRso): Promise<RsoSalvo> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("rsos")
    .insert({
      discord_user_id: dados.discordUserId,
      discord_user_name: dados.discordUserName,
      tipo: dados.tipo,
      turno: dados.turno,
      viatura: dados.viatura,
      prefixo: dados.prefixo,
      chefe_equipe: dados.chefeEquipe || null,
      motorista: dados.motorista || null,
      homem3: dados.homem3 || null,
      homem4: dados.homem4 || null,
      r1_encarregado: dados.r1Encarregado || null,
      r2_apoio_tatico: dados.r2ApoioTatico || null,
      r3_interventor: dados.r3Interventor || null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new Error("Você já tem um serviço em aberto.");
    }
    throw new Error(`Falha ao abrir o RSO: ${error?.message ?? "erro desconhecido"}`);
  }
  return mapRow(data);
}

export interface FechamentoRso {
  estado: EstadoRso;
  texto: string;
}

/** Encerra o RSO: grava a produtividade apurada, o texto final e eventuais correções feitas nos demais campos no fechamento. */
export async function closeRso(id: string, { estado, texto }: FechamentoRso): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const produtividade: ProdutividadeRso = {
    carrosVistoriados: estado.carrosVistoriados,
    motosVistoriadas: estado.motosVistoriadas,
    pessoasAbordadas: estado.pessoasAbordadas,
    armasApreendidas: estado.armasApreendidas,
    drogasApreendidas: estado.drogasApreendidas,
    veiculosRecolhidos: estado.veiculosRecolhidos,
    condenadosCapturados: estado.condenadosCapturados,
    flagrantes: estado.flagrantes,
    dinheiroSujo: estado.dinheiroSujo,
    outrosObjetos: estado.outrosObjetos,
  };

  const { error } = await supabase
    .from("rsos")
    .update({
      turno: estado.turno,
      viatura: estado.viatura,
      prefixo: estado.prefixo,
      chefe_equipe: estado.chefeEquipe || null,
      motorista: estado.motorista || null,
      homem3: estado.homem3 || null,
      homem4: estado.homem4 || null,
      r1_encarregado: estado.r1Encarregado || null,
      r2_apoio_tatico: estado.r2ApoioTatico || null,
      r3_interventor: estado.r3Interventor || null,
      produtividade,
      texto_fechamento: texto,
      encerrado_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao fechar o RSO: ${error.message}`);
  }
}

function crewSnapshotDoRso(rso: RsoSalvo): CrewSnapshot {
  return {
    chefeEquipe: rso.chefeEquipe,
    motorista: rso.motorista,
    homem3: rso.homem3,
    homem4: rso.homem4,
    r1Encarregado: rso.r1Encarregado,
    r2ApoioTatico: rso.r2ApoioTatico,
    r3Interventor: rso.r3Interventor,
  };
}

/** Registra a troca de integrante(s) da guarnição e já atualiza a guarnição corrente do RSO, para os próximos BOPMs saírem com os dados novos. */
export async function registrarRemodulacao(rso: RsoSalvo, integrantesNovos: CrewSnapshot): Promise<Remodulacao> {
  const supabase = createSupabaseAdminClient();
  const integrantesAnteriores = crewSnapshotDoRso(rso);

  const { data, error } = await supabase
    .from("rso_remodulacoes")
    .insert({
      rso_id: rso.id,
      integrantes_anteriores: integrantesAnteriores,
      integrantes_novos: integrantesNovos,
    })
    .select("trocado_em")
    .single();

  if (error || !data) {
    throw new Error(`Falha ao registrar a remodulação: ${error?.message ?? "erro desconhecido"}`);
  }

  const { error: updateError } = await supabase
    .from("rsos")
    .update({
      chefe_equipe: integrantesNovos.chefeEquipe || null,
      motorista: integrantesNovos.motorista || null,
      homem3: integrantesNovos.homem3 || null,
      homem4: integrantesNovos.homem4 || null,
      r1_encarregado: integrantesNovos.r1Encarregado || null,
      r2_apoio_tatico: integrantesNovos.r2ApoioTatico || null,
      r3_interventor: integrantesNovos.r3Interventor || null,
    })
    .eq("id", rso.id);

  if (updateError) {
    throw new Error(`Falha ao atualizar a guarnição do RSO: ${updateError.message}`);
  }

  return { trocadoEm: data.trocado_em as string, integrantesAnteriores, integrantesNovos };
}

/** Histórico de remodulações do RSO, em ordem cronológica. */
export async function listRemodulacoes(rsoId: string): Promise<Remodulacao[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("rso_remodulacoes")
    .select("trocado_em, integrantes_anteriores, integrantes_novos")
    .eq("rso_id", rsoId)
    .order("trocado_em", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    trocadoEm: row.trocado_em as string,
    integrantesAnteriores: row.integrantes_anteriores as CrewSnapshot,
    integrantesNovos: row.integrantes_novos as CrewSnapshot,
  }));
}
