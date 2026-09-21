export type QuestionKey =
  | "prefixo"
  | "chefeEquipe"
  | "motorista"
  | "homem3"
  | "homem4"
  | "local"
  | "veiculo"
  | "relatoBruto";

export interface Question {
  key: QuestionKey;
  label: string;
  placeholder: string;
  helpText?: string;
  optional: boolean;
  multiline?: boolean;
}

export const QUESTIONS: Question[] = [
  {
    key: "prefixo",
    label: "Prefixo da viatura",
    placeholder: "Ex.: M-12345",
    optional: false,
  },
  {
    key: "chefeEquipe",
    label: "Chefe da equipe",
    placeholder: "Nome do chefe da equipe",
    optional: false,
  },
  {
    key: "motorista",
    label: "Motorista",
    placeholder: "Nome do motorista",
    optional: false,
  },
  {
    key: "homem3",
    label: "3° Homem Auxiliar",
    placeholder: "Deixe em branco se não houver",
    optional: true,
  },
  {
    key: "homem4",
    label: "4° Homem Auxiliar",
    placeholder: "Deixe em branco se não houver",
    optional: true,
  },
  {
    key: "local",
    label: "Local da ocorrência",
    placeholder: "Endereço ou referência do local",
    optional: false,
  },
  {
    key: "veiculo",
    label: "Veículo do indivíduo",
    placeholder: "Deixe em branco se não houver",
    optional: true,
  },
  {
    key: "relatoBruto",
    label: "Relato da ocorrência",
    placeholder: "Descreva o que aconteceu, pode ser informal",
    helpText:
      "A IA vai gerar automaticamente a NATUREZA DOS FATOS, os MATERIAIS ILÍCITOS APREENDIDOS e os ARTIGOS aplicáveis a partir do que você descrever.",
    optional: false,
    multiline: true,
  },
];

export const CREW_KEYS: QuestionKey[] = ["prefixo", "chefeEquipe", "motorista", "homem3", "homem4"];

export type BoletimFields = Record<QuestionKey, string>;

/** Rótulos de composição de viatura da ROCAM — reaproveita os mesmos campos (chefeEquipe/motorista/homem3) com o nome dos postos R1/R2/R3, para não precisar de um schema de BOPM separado. */
export const LABELS_EQUIPE_ROCAM: Partial<Record<QuestionKey, string>> = {
  chefeEquipe: "R1 - Encarregado",
  motorista: "R2 - Apoio Tático",
  homem3: "R3 - Interventor",
};
