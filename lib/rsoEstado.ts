export type TipoViatura = "quatro_rodas" | "rocam";

/** Prefixos das viaturas 4 rodas da frota — ROCAM não tem frota fixa, então segue como texto livre. */
export const PREFIXOS_VIATURA = [
  "M-92000",
  "M-92001",
  "M-92002",
  "M-92100",
  "M-92200",
  "M-92140",
  "M-92115",
  "M-92213",
  "M-92219",
  "M-92424",
] as const;

export interface EstadoRso {
  tipo: TipoViatura;
  data: string;
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
  carrosVistoriados: string;
  motosVistoriadas: string;
  pessoasAbordadas: string;
  armasApreendidas: string;
  drogasApreendidas: string;
  veiculosRecolhidos: string;
  condenadosCapturados: string;
  flagrantes: string;
  dinheiroSujo: string;
  outrosObjetos: string;
}

/**
 * Campos de texto do RSO — usados no tool schema da IA para revisão via
 * instrução livre. Não inclui `tipo` (define qual template renderizar, não
 * editável assim) nem os campos de guarnição (agora guardam o ID da conta
 * do Discord, não texto — trocar integrante é só via Remodulação).
 */
export const CAMPOS_TEXTO_ESTADO_RSO = [
  "data",
  "turno",
  "viatura",
  "prefixo",
  "carrosVistoriados",
  "motosVistoriadas",
  "pessoasAbordadas",
  "armasApreendidas",
  "drogasApreendidas",
  "veiculosRecolhidos",
  "condenadosCapturados",
  "flagrantes",
  "dinheiroSujo",
  "outrosObjetos",
] as const satisfies readonly (keyof EstadoRso)[];

/** Campos de guarnição de um RSO — usados no registro de remodulação (snapshot antes/depois da troca). */
export const CAMPOS_GUARNICAO_RSO = [
  "chefeEquipe",
  "motorista",
  "homem3",
  "homem4",
  "r1Encarregado",
  "r2ApoioTatico",
  "r3Interventor",
] as const satisfies readonly (keyof EstadoRso)[];

export type CrewSnapshot = Pick<EstadoRso, (typeof CAMPOS_GUARNICAO_RSO)[number]>;

/** Rótulo de exibição de cada cargo de guarnição, usado no log de remodulações do relatório final. */
export const LABEL_CARGO_GUARNICAO: Record<(typeof CAMPOS_GUARNICAO_RSO)[number], string> = {
  chefeEquipe: "Comando da viatura",
  motorista: "Motorista",
  homem3: "3º Homem",
  homem4: "4º Homem",
  r1Encarregado: "R1 - Encarregado",
  r2ApoioTatico: "R2 - Apoio Tático",
  r3Interventor: "R3 - Interventor",
};

export interface Remodulacao {
  trocadoEm: string;
  integrantesAnteriores: CrewSnapshot;
  integrantesNovos: CrewSnapshot;
}
