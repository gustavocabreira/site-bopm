import type { BoletimSalvo } from "./boletimStore";
import type { CategoriaMaterial, MaterialApreendido } from "./materiais";
import type { EstadoRso } from "./rsoEstado";

const CATEGORIAS_ARMA: CategoriaMaterial[] = ["Arma de fogo", "Arma branca"];
const CATEGORIAS_DROGA: CategoriaMaterial[] = [
  "Maconha",
  "Cocaína",
  "Crack",
  "Lança-perfume",
  "LSD",
  "Ecstasy",
  "Haxixe",
  "Skunk",
  "Outra droga",
  "Mesa de drogas",
];
const CATEGORIAS_OUTROS: CategoriaMaterial[] = ["Munição", "Documento", "Outro"];

function materiaisDasCategorias(materiais: MaterialApreendido[], categorias: CategoriaMaterial[]): MaterialApreendido[] {
  return materiais.filter((material) => categorias.includes(material.categoria));
}

function resumirMateriais(materiais: MaterialApreendido[]): string {
  if (materiais.length === 0) return "Nenhum";
  return materiais.map((material) => `${material.quantidade} ${material.unidade} de ${material.descricao}`).join(", ");
}

function somarQuantidade(materiais: MaterialApreendido[]): number {
  return materiais.reduce((soma, material) => soma + material.quantidade, 0);
}

export type ProdutividadeRso = Pick<
  EstadoRso,
  | "carrosVistoriados"
  | "motosVistoriadas"
  | "pessoasAbordadas"
  | "armasApreendidas"
  | "drogasApreendidas"
  | "veiculosRecolhidos"
  | "condenadosCapturados"
  | "flagrantes"
  | "dinheiroSujo"
  | "outrosObjetos"
>;

/**
 * Apura a produtividade a partir dos BOPMs feitos no serviço. Campos sem
 * dado de origem no BOPM (carros/motos vistoriados, condenados capturados,
 * flagrantes) começam em "0" — o policial ajusta via instrução livre no
 * fechamento do RSO. Função pura (sem acesso a rede/banco) para poder rodar
 * tanto no servidor quanto no client.
 */
export function calcularProdutividadeAutomatica(boletins: BoletimSalvo[]): ProdutividadeRso {
  const materiais = boletins.flatMap((boletim) => boletim.materiais);
  const pessoasAbordadas = boletins.reduce(
    (soma, boletim) => soma + boletim.individuos.filter((individuo) => individuo.nome.trim().length > 0).length,
    0,
  );
  const dinheiro = somarQuantidade(materiaisDasCategorias(materiais, ["Dinheiro"]));

  return {
    carrosVistoriados: "0",
    motosVistoriadas: "0",
    pessoasAbordadas: String(pessoasAbordadas),
    armasApreendidas: resumirMateriais(materiaisDasCategorias(materiais, CATEGORIAS_ARMA)),
    drogasApreendidas: resumirMateriais(materiaisDasCategorias(materiais, CATEGORIAS_DROGA)),
    veiculosRecolhidos: String(somarQuantidade(materiaisDasCategorias(materiais, ["Veículo"]))),
    condenadosCapturados: "0",
    flagrantes: "0",
    dinheiroSujo: `R$ ${dinheiro}`,
    outrosObjetos: resumirMateriais(materiaisDasCategorias(materiais, CATEGORIAS_OUTROS)),
  };
}
