import { CAMPOS_GUARNICAO_RSO, LABEL_CARGO_GUARNICAO, type EstadoRso, type Remodulacao } from "./rsoEstado";
import { mencaoOuTexto, nomeDoMembro } from "./resolverNome";
import type { MembroGuilda } from "./membroGuilda";

/** Projeção de BoletimSalvo com só o que o template do RSO precisa para listar os BOPMs do serviço. */
export interface BopmDoServico {
  natureza: string;
  numeroSistema: string | null;
}

function formatarHorario(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/**
 * Log curto de cada remodulação (troca de integrante), uma linha por cargo
 * que de fato mudou entre os dois snapshots — reaproveitado tanto no
 * template final quanto na lista de remodulações da tela "em serviço".
 * Os snapshots guardam o ID da conta do Discord; por padrão ("nome") resolve
 * pro nome atual via `membros` (cai no próprio valor guardado se não achar —
 * registro antigo/órfão), usado na tela "em serviço". O RSO final pede
 * "mencao": vira `<@id>` (ver mencaoOuTexto) pra colar pronto num canal do
 * Discord, sem precisar de `membros`.
 */
export function resumoRemodulacoes(
  remodulacoes: Remodulacao[],
  membros: MembroGuilda[] = [],
  formato: "nome" | "mencao" = "nome",
): string[] {
  const resolver = (idOuTexto: string) => (formato === "mencao" ? mencaoOuTexto(idOuTexto) : nomeDoMembro(idOuTexto, membros));
  const linhas: string[] = [];
  for (const remodulacao of remodulacoes) {
    const horario = formatarHorario(remodulacao.trocadoEm);
    for (const campo of CAMPOS_GUARNICAO_RSO) {
      const anterior = remodulacao.integrantesAnteriores[campo]?.trim() ?? "";
      const novo = remodulacao.integrantesNovos[campo]?.trim() ?? "";
      if (anterior === novo) continue;
      const nomeAnterior = anterior ? resolver(anterior) : "";
      const nomeNovo = novo ? resolver(novo) : "";
      linhas.push(`${horario} — ${LABEL_CARGO_GUARNICAO[campo]}: ${nomeAnterior || "—"} → ${nomeNovo || "—"}`);
    }
  }
  return linhas;
}

/**
 * Linhas finais do relatório, depois do bloco de produtividade (e, no caso
 * do ROCAM, depois da linha extra de patrulhamento). Reproduz as duas
 * linhas em branco antes da assinatura do template original quando não há
 * BOPM nem remodulação, ou intercala a lista de BOPMs do serviço (com o
 * número no sistema da cidade, informado pelo policial no fechamento) e/ou
 * o log de remodulações nesse espaço quando há.
 */
function linhasSecoesFinais(boletins: BopmDoServico[], remodulacoes: Remodulacao[]): string[] {
  const blocos: string[] = [];

  if (boletins.length > 0) {
    blocos.push("**BOPMs DO SERVIÇO:**");
    for (const boletim of boletins) {
      const numero = boletim.numeroSistema?.trim() || "não informado";
      blocos.push(`- Nº ${numero} — ${boletim.natureza}`);
    }
  }

  const resumo = resumoRemodulacoes(remodulacoes, [], "mencao");
  if (resumo.length > 0) {
    if (blocos.length > 0) blocos.push("");
    blocos.push("**REMODULAÇÕES:**", ...resumo.map((linha) => `- ${linha}`));
  }

  if (blocos.length === 0) return ["", ""];
  return ["", "", ...blocos, ""];
}

function linhasProdutividade(fields: EstadoRso): string[] {
  return [
    "P R O D U T I V I D A D E:",
    "",
    `Carros vistoriados: ${fields.carrosVistoriados}`,
    `Motos vistoriadas: ${fields.motosVistoriadas}`,
    `Pessoas Abordadas: ${fields.pessoasAbordadas}`,
    `Armas Apreendidas: ${fields.armasApreendidas}`,
    `Drogas Apreendidas: ${fields.drogasApreendidas}`,
    `Veículos Recolhidos: ${fields.veiculosRecolhidos}`,
    `Condenados Capturado: ${fields.condenadosCapturados}`,
    `Flagrantes: ${fields.flagrantes}`,
    `Dinheiro Sujo: ${fields.dinheiroSujo}`,
    `Outros objetos: ${fields.outrosObjetos}`,
  ];
}

function buildRso4Rodas(fields: EstadoRso, remodulacoes: Remodulacao[], boletins: BopmDoServico[]): string {
  const chefeEquipe = mencaoOuTexto(fields.chefeEquipe);
  const linhas = [
    "# <:escudopmesp:1505736415286136942> POLÍCIA MILITAR DO ESTADO DE SÃO PAULO<:ssp:1505743253545156761> #",
    "**<:2BPCHQ:1506017789117337743> 2°BPCHOQUE ANCHIETA**<:2BPCHQ:1506017789117337743> ",
    "",
    "",
    "**RELATÓRIO  DE SERVIÇO OPERACIONAL **",
    "",
    `Turnos das  inicio: ${fields.turno}`,
    `Data: ${fields.data}`,
    `Viatura: ${fields.viatura}`,
    `Prefixo: ${fields.prefixo}`,
    "",
    "",
    "E  Q  U  I  P  E :",
    `Comando da viatura: ${chefeEquipe}`,
    `Motorista:  ${mencaoOuTexto(fields.motorista)}`,
    `3º Homem:  ${mencaoOuTexto(fields.homem3)}`,
    `4º Homem: ${fields.homem4 ? mencaoOuTexto(fields.homem4) : "N/A"}`,
    "",
    ...linhasProdutividade(fields),
    ...linhasSecoesFinais(boletins, remodulacoes),
    `**Assinatura do Comando da viatura:** ${chefeEquipe}`,
  ];

  return linhas.join("\n");
}

function buildRsoRocam(fields: EstadoRso, remodulacoes: Remodulacao[], boletins: BopmDoServico[]): string {
  const r1Encarregado = mencaoOuTexto(fields.r1Encarregado);
  const linhas = [
    "# <:escudopmesp:1505736415286136942> POLÍCIA MILITAR DO ESTADO DE SÃO PAULO<:ssp:1505743253545156761> #",
    "# 2°BPCHOQUE ANCHIETA<:2BPCHQ:1506017789117337743> #",
    "",
    "",
    "**RELATÓRIO  DE SERVIÇO OPERACIONAL ROCAM<:download:1508440618219868392> **",
    "",
    `Turnos das  inicio: ${fields.turno}`,
    `Data: ${fields.data}`,
    `Viatura: ${fields.viatura}`,
    `Prefixo: ${fields.prefixo}`,
    "",
    "",
    "E  Q  U  I  P  E :",
    `R1 - ENCARREGADO:  ${r1Encarregado}`,
    `R2 - APOIO TÁTICO: ${mencaoOuTexto(fields.r2ApoioTatico)}`,
    `R3 - INTERVENTOR: ${fields.r3Interventor ? mencaoOuTexto(fields.r3Interventor) : "N/A"}`,
    "",
    ...linhasProdutividade(fields),
    "",
    "**ROCAM — RELATÓRIO DE PATRULHAMENTO**",
    ...linhasSecoesFinais(boletins, remodulacoes),
    `**Assinatura do encarregado:** ${r1Encarregado}`,
  ];

  return linhas.join("\n");
}

/**
 * Monta o texto final do RSO a partir dos campos coletados/apurados, no
 * padrão exigido para colar no Discord (mantém markdown e emojis
 * customizados). Os IDs de conta do Discord da guarnição viram menção
 * (`<@id>`, ver mencaoOuTexto) em vez do apelido puro, pra colar pronto
 * como ping no canal. Função pura e determinística, igual boletimTemplate.ts.
 */
export function buildRso(
  fields: EstadoRso,
  remodulacoes: Remodulacao[] = [],
  boletins: BopmDoServico[] = [],
): string {
  return fields.tipo === "rocam"
    ? buildRsoRocam(fields, remodulacoes, boletins)
    : buildRso4Rodas(fields, remodulacoes, boletins);
}
