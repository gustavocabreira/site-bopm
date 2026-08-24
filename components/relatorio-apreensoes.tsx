"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopMateriaisChart } from "@/components/top-materiais-chart";
import { DateRangePicker } from "@/components/date-range-picker";

const TODOS_POLICIAIS = "todos";

interface IndividuoRelatorio {
  nome: string;
  rg: string;
  boletimId: string;
  prefixo: string;
  local: string;
  createdAt: string;
}

interface MaterialAgregado {
  categoria: string;
  unidade: string;
  quantidadeTotal: number;
  ocorrencias: number;
}

interface RankingPolicial {
  policial: string;
  totalPresos: number;
  totalBoletins: number;
}

interface CategoriaTotal {
  categoria: string;
  total: number;
}

interface Resultado {
  totalBoletins: number;
  individuos: IndividuoRelatorio[];
  materiaisAgregados: MaterialAgregado[];
  rankingPrisoes: RankingPolicial[];
  topCategorias: CategoriaTotal[];
  todosPoliciais: string[];
}

function diasAtras(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data;
}

function formatarQuantidade(material: MaterialAgregado) {
  if (material.unidade === "R$") return `R$ ${material.quantidadeTotal.toLocaleString("pt-BR")}`;
  return `${material.quantidadeTotal.toLocaleString("pt-BR")} ${material.unidade}`;
}

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function RelatorioApreensoes() {
  const [from, setFrom] = useState(diasAtras(15));
  const [to, setTo] = useState(new Date());
  const [policial, setPolicial] = useState(TODOS_POLICIAIS);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    gerarRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function gerarRelatorio(overrides?: { policial?: string; from?: Date; to?: Date }) {
    const policialAtivo = overrides?.policial ?? policial;
    const fromAtivo = overrides?.from ?? from;
    const toAtivo = overrides?.to ?? to;

    if (fromAtivo > toAtivo) {
      toast.error("A data inicial deve ser anterior à data final.");
      return;
    }

    setCarregando(true);
    try {
      const params = new URLSearchParams({
        from: format(fromAtivo, "yyyy-MM-dd"),
        to: format(toAtivo, "yyyy-MM-dd"),
      });
      if (policialAtivo !== TODOS_POLICIAIS) params.set("policial", policialAtivo);

      const res = await fetch(`/api/relatorio-apreensoes?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao gerar o relatório.");
        return;
      }

      setResultado(data);
    } catch {
      toast.error("Falha de conexão ao gerar o relatório.");
    } finally {
      setCarregando(false);
    }
  }

  function onPeriodoChange(range: { from: Date; to: Date }) {
    setFrom(range.from);
    setTo(range.to);
    gerarRelatorio({ from: range.from, to: range.to });
  }

  const policialFiltrado = policial !== TODOS_POLICIAIS ? policial : null;

  function onPolicialChange(value: string | null) {
    const novoValor = value ?? TODOS_POLICIAIS;
    setPolicial(novoValor);
    gerarRelatorio({ policial: novoValor });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label>Período</Label>
            <DateRangePicker from={from} to={to} onChange={onPeriodoChange} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Policial</Label>
            <Select value={policial} onValueChange={onPolicialChange}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS_POLICIAIS}>Todos</SelectItem>
                {(resultado?.todosPoliciais ?? []).map((nome) => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => gerarRelatorio()} disabled={carregando}>
            {carregando ? "Gerando..." : "Gerar relatório"}
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <>
          {policialFiltrado && (
            <p className="text-sm text-muted-foreground">
              Mostrando apenas registros com <span className="font-medium text-foreground">{policialFiltrado}</span> na
              equipe.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label={policialFiltrado ? "Boletins participados" : "Boletins no período"}
              value={resultado.totalBoletins}
            />
            <StatTile label="Indivíduos abordados/presos" value={resultado.individuos.length} />
            <StatTile
              label="Itens apreendidos"
              value={resultado.topCategorias.reduce((soma, item) => soma + item.total, 0)}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          <div className={`grid grid-cols-1 gap-4 ${policialFiltrado ? "" : "lg:grid-cols-2"}`}>
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Top itens mais apreendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <TopMateriaisChart dados={resultado.topCategorias} />
              </CardContent>
            </Card>

            {!policialFiltrado && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Ranking de prisões por policial</CardTitle>
                </CardHeader>
                <CardContent>
                  {resultado.rankingPrisoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma prisão com integrante de equipe registrado no período.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground/80">
                            <th className="py-2 pr-4">#</th>
                            <th className="py-2 pr-4">Policial</th>
                            <th className="py-2 pr-4">Prisões</th>
                            <th className="py-2">Boletins</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.rankingPrisoes.map((policial, index) => (
                            <tr key={policial.policial} className="border-b border-border/30 last:border-0">
                              <td className="py-2 pr-4 text-muted-foreground">{index + 1}</td>
                              <td className="py-2 pr-4">{policial.policial}</td>
                              <td className="py-2 pr-4">{policial.totalPresos}</td>
                              <td className="py-2">{policial.totalBoletins}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Indivíduos abordados/presos</CardTitle>
            </CardHeader>
            <CardContent>
              {resultado.individuos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum indivíduo registrado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground/80">
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">RG</th>
                        <th className="py-2 pr-4">Prefixo</th>
                        <th className="py-2 pr-4">Local</th>
                        <th className="py-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.individuos.map((individuo, index) => (
                        <tr key={`${individuo.boletimId}-${index}`} className="border-b border-border/30 last:border-0">
                          <td className="py-2 pr-4">{individuo.nome}</td>
                          <td className="py-2 pr-4">{individuo.rg || "—"}</td>
                          <td className="py-2 pr-4">{individuo.prefixo}</td>
                          <td className="py-2 pr-4">{individuo.local}</td>
                          <td className="py-2">{formatarData(individuo.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Materiais apreendidos (detalhado)</CardTitle>
            </CardHeader>
            <CardContent>
              {resultado.materiaisAgregados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum material apreendido registrado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground/80">
                        <th className="py-2 pr-4">Categoria</th>
                        <th className="py-2 pr-4">Total</th>
                        <th className="py-2">Ocorrências</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.materiaisAgregados.map((material) => (
                        <tr key={`${material.categoria}-${material.unidade}`} className="border-b border-border/30 last:border-0">
                          <td className="py-2 pr-4">{material.categoria}</td>
                          <td className="py-2 pr-4">{formatarQuantidade(material)}</td>
                          <td className="py-2">{material.ocorrencias}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <Card className={`border-border/60 shadow-sm ${className}`}>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold text-foreground">{value.toLocaleString("pt-BR")}</span>
      </CardContent>
    </Card>
  );
}
