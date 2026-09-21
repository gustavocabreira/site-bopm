import type { Individuo } from "./boletimEstado";
import { formatarMateriaisApreendidos, type MaterialApreendido } from "./materiais";
import type { TipoViatura } from "./rsoEstado";
import { nomeDoMembro } from "./resolverNome";
import type { MembroGuilda } from "./membroGuilda";

const SEPARADOR = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";

export interface BoletimData {
  data: string;
  horario: string;
  prefixo: string;
  chefeEquipe: string;
  motorista: string;
  homem3: string;
  homem4: string;
  individuos: Individuo[];
  natureza: string;
  local: string;
  veiculo: string;
  materiaisApreendidos: MaterialApreendido[];
  relato: string;
  artigos: string | null;
}

/**
 * Linhas da seção EQUIPE — no ROCAM usa a composição R1/R2/R3 em vez de
 * chefe/motorista/homens auxiliares (os mesmos campos chefeEquipe/motorista/
 * homem3 são reaproveitados com o rótulo do posto, sem 4° homem). Os campos
 * guardam o ID da conta do Discord de cada integrante; `membros` resolve pro
 * nome atual (cai no próprio valor guardado se não achar).
 */
function linhasEquipe(fields: BoletimData, tipo: TipoViatura, markdown: boolean, membros: MembroGuilda[]): string[] {
  const rotulo = (texto: string) => (markdown ? `**${texto}**` : texto);
  const nome = (id: string) => (id ? nomeDoMembro(id, membros) : "");

  if (tipo === "rocam") {
    return [
      rotulo("EQUIPE:"),
      `${rotulo("R1 - Encarregado:")} ${nome(fields.chefeEquipe)}`,
      `${rotulo("R2 - Apoio Tático:")} ${nome(fields.motorista)}`,
      `${rotulo("R3 - Interventor:")} ${fields.homem3 ? nome(fields.homem3) : "N/A"}`,
    ];
  }

  return [
    rotulo("EQUIPE:"),
    `${rotulo("Chefe da Equipe:")} ${nome(fields.chefeEquipe)}`,
    `${rotulo("Motorista:")} ${nome(fields.motorista)}`,
    `${rotulo("3° Homem Auxiliar:")} ${nome(fields.homem3)}`,
    `${rotulo("4° Homem Auxiliar:")} ${nome(fields.homem4)}`,
  ];
}

function linhasIndividuos(individuos: Individuo[], markdown: boolean): string[] {
  if (individuos.length === 0) {
    const label = markdown ? "**IDENTIFICAÇÃO DO INDIVÍDUO:**" : "IDENTIFICAÇÃO DO INDIVÍDUO:";
    return [label, markdown ? "**Nome e Sobrenome:** " : "Nome e Sobrenome: ", markdown ? "**RG:** " : "RG: "];
  }

  const titulo =
    individuos.length > 1
      ? markdown
        ? "**IDENTIFICAÇÃO DOS INDIVÍDUOS:**"
        : "IDENTIFICAÇÃO DOS INDIVÍDUOS:"
      : markdown
        ? "**IDENTIFICAÇÃO DO INDIVÍDUO:**"
        : "IDENTIFICAÇÃO DO INDIVÍDUO:";

  const linhas = [titulo];
  individuos.forEach((individuo, index) => {
    const prefixoNumero = individuos.length > 1 ? `${index + 1}. ` : "";
    linhas.push(
      markdown
        ? `**${prefixoNumero}Nome e Sobrenome:** ${individuo.nome}`
        : `${prefixoNumero}Nome e Sobrenome: ${individuo.nome}`,
    );
    linhas.push(markdown ? `**RG:** ${individuo.rg}` : `RG: ${individuo.rg}`);
  });
  return linhas;
}

/**
 * Monta o texto final do BOPM BAEP a partir dos campos coletados e do conteudo
 * gerado (natureza, materiais apreendidos, artigos). Funcao pura e deterministica.
 */
export function buildBoletim(fields: BoletimData, tipo: TipoViatura = "quatro_rodas", membros: MembroGuilda[] = []): string {
  const linhas = [
    "# BOLETIM DE OCORRÊNCIA DA POLÍCIA MILITAR DE SÃO PAULO",
    SEPARADOR,
    "",
    "# IDENTIFICAÇÃO",
    "",
    `**DATA E HORA:** ${fields.data} ${fields.horario}`,
    `**UNIDADE DE SERVIÇO:** Prefixo: ${fields.prefixo}`,
    ...linhasEquipe(fields, tipo, true, membros),
    SEPARADOR,
    "",
    "# DADOS DA OCORRÊNCIA",
    "",
    ...linhasIndividuos(fields.individuos, true),
    `**NATUREZA DOS FATOS:** ${fields.natureza}`,
    `**LOCAL DA OCORRÊNCIA:** ${fields.local}`,
    `**VEÍCULO DO INDIVÍDUO:** ${fields.veiculo || ""}`,
    `**MATERIAIS ILÍCITOS APREENDIDOS:**`,
    formatarMateriaisApreendidos(fields.materiaisApreendidos),
    SEPARADOR,
    "# RELATO DA OCORRÊNCIA",
    fields.relato,
    SEPARADOR,
    "# ARTIGOS",
    fields.artigos || "",
  ];

  return linhas.join("\n");
}

/**
 * Mesma estrutura do buildBoletim, mas sem marcacao markdown (** e #) —
 * usado pelo botao "Copiar texto", pensado para colar em outros sistemas.
 */
export function buildBoletimTextoPuro(fields: BoletimData, tipo: TipoViatura = "quatro_rodas", membros: MembroGuilda[] = []): string {
  const linhas = [
    "BOLETIM DE OCORRÊNCIA DA POLÍCIA MILITAR DE SÃO PAULO",
    SEPARADOR,
    "",
    "IDENTIFICAÇÃO",
    "",
    `DATA E HORA: ${fields.data} ${fields.horario}`,
    `UNIDADE DE SERVIÇO: Prefixo: ${fields.prefixo}`,
    ...linhasEquipe(fields, tipo, false, membros),
    SEPARADOR,
    "",
    "DADOS DA OCORRÊNCIA",
    "",
    ...linhasIndividuos(fields.individuos, false),
    `NATUREZA DOS FATOS: ${fields.natureza}`,
    `LOCAL DA OCORRÊNCIA: ${fields.local}`,
    `VEÍCULO DO INDIVÍDUO: ${fields.veiculo || ""}`,
    `MATERIAIS ILÍCITOS APREENDIDOS:`,
    formatarMateriaisApreendidos(fields.materiaisApreendidos),
    SEPARADOR,
    "RELATO DA OCORRÊNCIA",
    fields.relato,
    SEPARADOR,
    "ARTIGOS",
    fields.artigos || "",
  ];

  return linhas.join("\n");
}
