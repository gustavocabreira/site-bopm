import type { Individuo } from "./boletimEstado";
import { formatarMateriaisApreendidos, type MaterialApreendido } from "./materiais";

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
export function buildBoletim(fields: BoletimData): string {
  const linhas = [
    "# BOLETIM DE OCORRÊNCIA DA POLÍCIA MILITAR DE SÃO PAULO",
    SEPARADOR,
    "",
    "# IDENTIFICAÇÃO",
    "",
    `**DATA E HORA:** ${fields.data} ${fields.horario}`,
    `**UNIDADE DE SERVIÇO:** Prefixo: ${fields.prefixo}`,
    "**EQUIPE:**",
    `**Chefe da Equipe:** ${fields.chefeEquipe}`,
    `**Motorista:** ${fields.motorista}`,
    `**3° Homem Auxiliar:** ${fields.homem3 || ""}`,
    `**4° Homem Auxiliar:** ${fields.homem4 || ""}`,
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
export function buildBoletimTextoPuro(fields: BoletimData): string {
  const linhas = [
    "BOLETIM DE OCORRÊNCIA DA POLÍCIA MILITAR DE SÃO PAULO",
    SEPARADOR,
    "",
    "IDENTIFICAÇÃO",
    "",
    `DATA E HORA: ${fields.data} ${fields.horario}`,
    `UNIDADE DE SERVIÇO: Prefixo: ${fields.prefixo}`,
    "EQUIPE:",
    `Chefe da Equipe: ${fields.chefeEquipe}`,
    `Motorista: ${fields.motorista}`,
    `3° Homem Auxiliar: ${fields.homem3 || ""}`,
    `4° Homem Auxiliar: ${fields.homem4 || ""}`,
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
