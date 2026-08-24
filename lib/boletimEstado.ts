import type { MaterialApreendido } from "./materiais";

export interface Individuo {
  nome: string;
  rg: string;
}

export interface EstadoBoletim {
  prefixo: string;
  chefeEquipe: string;
  motorista: string;
  homem3: string;
  homem4: string;
  individuos: Individuo[];
  local: string;
  veiculo: string;
  relato: string;
  natureza: string;
  materiaisApreendidos: MaterialApreendido[];
  artigos: string | null;
}

/** Campos de texto simples do boletim — usados para copiar/validar valores inalterados na revisão via IA. */
export const CAMPOS_TEXTO_ESTADO_BOLETIM = [
  "prefixo",
  "chefeEquipe",
  "motorista",
  "homem3",
  "homem4",
  "local",
  "veiculo",
  "relato",
  "natureza",
  "artigos",
] as const;
