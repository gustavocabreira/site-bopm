export interface EstadoBoletim {
  prefixo: string;
  chefeEquipe: string;
  motorista: string;
  homem3: string;
  homem4: string;
  individuoNome: string;
  individuoRG: string;
  local: string;
  veiculo: string;
  relato: string;
  natureza: string;
  materiaisApreendidos: string | null;
  artigos: string | null;
}

export const CAMPOS_ESTADO_BOLETIM = [
  "prefixo",
  "chefeEquipe",
  "motorista",
  "homem3",
  "homem4",
  "individuoNome",
  "individuoRG",
  "local",
  "veiculo",
  "relato",
  "natureza",
  "materiaisApreendidos",
  "artigos",
] as const;
