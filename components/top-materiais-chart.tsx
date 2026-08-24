"use client";

import { useState } from "react";

interface CategoriaTotal {
  categoria: string;
  total: number;
}

// Paleta categorica validada (passos dark — o app roda sempre em tema escuro).
// So os 3 primeiros slots validam todos os pares entre si; o resto vira "Outros" em cinza neutro.
const CORES_CATEGORIA = ["#3987e5", "#d95926", "#199e70"];
const COR_OUTROS = "#6b7280";

const RAIO = 45;
const CENTRO = 60;
const ESPESSURA = 20;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
const GAP_PX = 3;

export function TopMateriaisChart({ dados }: { dados: CategoriaTotal[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);

  const total = dados.reduce((soma, item) => soma + item.total, 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum material apreendido registrado no período.</p>;
  }

  let acumulado = 0;
  const segmentos = dados.map((item, index) => {
    const fracao = item.total / total;
    const comprimento = Math.max(fracao * CIRCUNFERENCIA - GAP_PX, 0);
    const offset = -(acumulado * CIRCUNFERENCIA) - GAP_PX / 2;
    acumulado += fracao;
    return {
      ...item,
      pct: fracao * 100,
      comprimento,
      offset,
      cor: item.categoria === "Outros" ? COR_OUTROS : (CORES_CATEGORIA[index] ?? COR_OUTROS),
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <svg width={120} height={120} viewBox="0 0 120 120" role="img" aria-label="Top itens apreendidos no período">
        <circle cx={CENTRO} cy={CENTRO} r={RAIO} fill="none" stroke="var(--muted)" strokeWidth={ESPESSURA} />
        <g transform={`rotate(-90 ${CENTRO} ${CENTRO})`}>
          {segmentos.map((seg, index) => (
            <circle
              key={seg.categoria}
              cx={CENTRO}
              cy={CENTRO}
              r={RAIO}
              fill="none"
              stroke={seg.cor}
              strokeWidth={ativo === index ? ESPESSURA + 4 : ESPESSURA}
              strokeDasharray={`${seg.comprimento} ${CIRCUNFERENCIA - seg.comprimento}`}
              strokeDashoffset={seg.offset}
              tabIndex={0}
              role="button"
              aria-label={`${seg.categoria}: ${seg.total} (${seg.pct.toFixed(0)}%)`}
              className="cursor-pointer outline-none transition-[stroke-width]"
              onMouseEnter={() => setAtivo(index)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(index)}
              onBlur={() => setAtivo(null)}
            />
          ))}
        </g>
        <text x={CENTRO} y={CENTRO - 3} textAnchor="middle" className="fill-foreground text-[18px] font-semibold">
          {total}
        </text>
        <text x={CENTRO} y={CENTRO + 12} textAnchor="middle" className="fill-muted-foreground text-[9px]">
          itens
        </text>
      </svg>

      <ul className="flex flex-col gap-2">
        {segmentos.map((seg, index) => (
          <li
            key={seg.categoria}
            className={`flex items-center gap-2 rounded-sm px-1.5 py-0.5 text-sm transition-colors ${ativo === index ? "bg-muted" : ""}`}
            onMouseEnter={() => setAtivo(index)}
            onMouseLeave={() => setAtivo(null)}
          >
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: seg.cor }} aria-hidden="true" />
            <span className="text-foreground">{seg.categoria}</span>
            <span className="text-muted-foreground">
              {seg.total} · {seg.pct.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
