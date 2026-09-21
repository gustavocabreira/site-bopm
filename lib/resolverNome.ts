import type { MembroGuilda } from "./membroGuilda";

/**
 * Resolve o ID da conta do Discord guardado num campo de guarnição pro nome
 * atual do membro (cache de guild_members). Se não achar (conta que saiu da
 * guilda, ainda não sincronizada, ou registro antigo que guardava o nome
 * como texto puro antes dessa mudança), devolve o próprio valor guardado —
 * mantém registros antigos/órfãos legíveis em vez de quebrar.
 */
export function nomeDoMembro(idOuTexto: string, membros: MembroGuilda[]): string {
  if (!idOuTexto) return idOuTexto;
  return membros.find((membro) => membro.id === idOuTexto)?.nome ?? idOuTexto;
}

const REGEX_ID_DISCORD = /^\d{15,20}$/;

/**
 * Menção Discord (`<@id>`) quando o valor guardado é um ID de conta —
 * usado no RSO final pra colar direto num canal de texto do Discord: vira
 * ping clicável com o nome/apelido atual da conta, em vez de travar no
 * apelido puro (que fica desatualizado se a pessoa trocar de nick). Cai no
 * próprio valor guardado pra registro antigo que guardava o nome como
 * texto puro (não bate o formato de snowflake do Discord).
 */
export function mencaoOuTexto(idOuTexto: string): string {
  if (!idOuTexto) return idOuTexto;
  return REGEX_ID_DISCORD.test(idOuTexto) ? `<@${idOuTexto}>` : idOuTexto;
}
