export const CATEGORIAS_MATERIAL = [
  "Arma de fogo",
  "Arma branca",
  "Munição",
  "Droga",
  "Dinheiro",
  "Veículo",
  "Documento",
  "Outro",
] as const;

export type CategoriaMaterial = (typeof CATEGORIAS_MATERIAL)[number];

export const UNIDADES_MATERIAL = ["unidade(s)", "grama(s)", "quilo(s)", "litro(s)", "R$"] as const;

export type UnidadeMaterial = (typeof UNIDADES_MATERIAL)[number];

export interface MaterialApreendido {
  categoria: CategoriaMaterial;
  quantidade: number;
  unidade: string;
  descricao: string;
}

/** Formata a lista estruturada de materiais no texto usado no corpo do boletim. */
export function formatarMateriaisApreendidos(materiais: MaterialApreendido[]): string {
  if (materiais.length === 0) return "";
  return materiais
    .map((material) => {
      const quantidade = material.unidade === "R$" ? `R$ ${material.quantidade}` : `${material.quantidade} ${material.unidade}`;
      return `- ${quantidade} — ${material.descricao}`;
    })
    .join("\n");
}
