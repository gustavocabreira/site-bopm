"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/date-range-picker";
import type { MatrizHeatmapTurnos } from "@/lib/turnosHeatmap";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HORAS = Array.from({ length: 24 }, (_, hora) => hora);

/** Rampa sequencial azul (clara->escura, ver skill de dataviz), do menos intenso pro mais intenso — em superfície escura, "mais" fica mais claro/vivo. */
const DEGRAUS_INTENSIDADE = ["#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4", "#cde2fb"];

function corDaCelula(valor: number, max: number): string {
  if (valor === 0 || max === 0) return "";
  const indice = Math.min(DEGRAUS_INTENSIDADE.length - 1, Math.ceil((valor / max) * DEGRAUS_INTENSIDADE.length) - 1);
  return DEGRAUS_INTENSIDADE[Math.max(0, indice)];
}

function maiorValor(matriz: MatrizHeatmapTurnos): number {
  return matriz.reduce((max, linha) => Math.max(max, ...linha), 0);
}

function topHorarios(matriz: MatrizHeatmapTurnos, quantidade: number) {
  const celulas = matriz.flatMap((linha, diaSemana) =>
    linha.map((valor, hora) => ({ diaSemana, hora, valor })),
  );
  return celulas
    .filter((celula) => celula.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, quantidade);
}

export function TurnosHeatmap() {
  const [from, setFrom] = useState(() => new Date());
  const [to, setTo] = useState(() => new Date());
  const [matriz, setMatriz] = useState<MatrizHeatmapTurnos | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscar(overrides?: { from?: Date; to?: Date }) {
    const fromAtivo = overrides?.from ?? from;
    const toAtivo = overrides?.to ?? to;

    setCarregando(true);
    const params = new URLSearchParams({
      from: format(fromAtivo, "yyyy-MM-dd"),
      to: format(toAtivo, "yyyy-MM-dd"),
    });

    try {
      const res = await fetch(`/api/turnos-heatmap?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data.matriz)) setMatriz(data.matriz);
    } finally {
      setCarregando(false);
    }
  }

  function onPeriodoChange(range: { from: Date; to: Date }) {
    setFrom(range.from);
    setTo(range.to);
    buscar({ from: range.from, to: range.to });
  }

  const max = matriz ? maiorValor(matriz) : 0;
  const semDados = !matriz || matriz.flat().every((valor) => valor === 0);
  const top5 = matriz ? topHorarios(matriz, 5) : [];

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <Label className="text-sm font-semibold">Período</Label>
        </CardHeader>
        <CardContent>
          <DateRangePicker from={from} to={to} onChange={onPeriodoChange} />
        </CardContent>
      </Card>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : semDados ? (
        <p className="text-sm text-muted-foreground">Nenhum turno nesse período.</p>
      ) : (
        <>
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Turnos em serviço por dia e horário</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="overflow-x-auto">
                <div className="inline-flex flex-col gap-1">
                  <div className="flex gap-1 pl-12">
                    {HORAS.map((hora) => (
                      <div key={hora} className="w-6 shrink-0 text-center text-[10px] text-muted-foreground">
                        {hora % 3 === 0 ? hora : ""}
                      </div>
                    ))}
                  </div>
                  {matriz!.map((linha, diaSemana) => (
                    <div key={diaSemana} className="flex items-center gap-1">
                      <div className="w-11 shrink-0 text-xs text-muted-foreground">{DIAS[diaSemana]}</div>
                      {linha.map((valor, hora) => (
                        <div
                          key={hora}
                          title={`${DIAS[diaSemana]} ${String(hora).padStart(2, "0")}h: ${valor} turno(s)`}
                          className="size-6 shrink-0 rounded-sm bg-muted/40"
                          style={valor > 0 ? { backgroundColor: corDaCelula(valor, max) } : undefined}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pl-12">
                <span className="text-xs text-muted-foreground">Menos</span>
                <div className="flex gap-1">
                  <div className="size-4 rounded-sm bg-muted/40" title="Sem turnos" />
                  {DEGRAUS_INTENSIDADE.map((cor) => (
                    <div key={cor} className="size-4 rounded-sm" style={{ backgroundColor: cor }} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Mais</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Horários mais movimentados</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-1.5 text-sm">
                {top5.map((item, index) => (
                  <li key={`${item.diaSemana}-${item.hora}`} className="flex items-center gap-2">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span className="font-medium">
                      {DIAS[item.diaSemana]} às {String(item.hora).padStart(2, "0")}h
                    </span>
                    <span className="text-muted-foreground">— {item.valor} turno(s)</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
