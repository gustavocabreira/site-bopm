const SEPARADOR = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";

export interface BoletimData {
  data: string;
  horario: string;
  prefixo: string;
  chefeEquipe: string;
  motorista: string;
  homem3: string;
  homem4: string;
  individuoNome: string;
  individuoRG: string;
  natureza: string;
  local: string;
  veiculo: string;
  materiaisApreendidos: string | null;
  relato: string;
  artigos: string | null;
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
    "**IDENTIFICAÇÃO DO INDIVÍDUO:**",
    `**Nome e Sobrenome:** ${fields.individuoNome || ""}`,
    `**RG:** ${fields.individuoRG || ""}`,
    `**NATUREZA DOS FATOS:** ${fields.natureza}`,
    `**LOCAL DA OCORRÊNCIA:** ${fields.local}`,
    `**VEÍCULO DO INDIVÍDUO:** ${fields.veiculo || ""}`,
    `**MATERIAIS ILÍCITOS APREENDIDOS:** ${fields.materiaisApreendidos || ""}`,
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
    "IDENTIFICAÇÃO DO INDIVÍDUO:",
    `Nome e Sobrenome: ${fields.individuoNome || ""}`,
    `RG: ${fields.individuoRG || ""}`,
    `NATUREZA DOS FATOS: ${fields.natureza}`,
    `LOCAL DA OCORRÊNCIA: ${fields.local}`,
    `VEÍCULO DO INDIVÍDUO: ${fields.veiculo || ""}`,
    `MATERIAIS ILÍCITOS APREENDIDOS: ${fields.materiaisApreendidos || ""}`,
    SEPARADOR,
    "RELATO DA OCORRÊNCIA",
    fields.relato,
    SEPARADOR,
    "ARTIGOS",
    fields.artigos || "",
  ];

  return linhas.join("\n");
}
