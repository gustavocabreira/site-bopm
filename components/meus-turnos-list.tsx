"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatarDuracao } from "@/lib/dateFormatter";
import type { RsoSalvo } from "@/lib/rsoStore";

const LABEL_TIPO: Record<RsoSalvo["tipo"], string> = {
  quatro_rodas: "Viatura 4 rodas",
  rocam: "ROCAM",
};

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function MeusTurnosList({ rsos }: { rsos: RsoSalvo[] }) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [agora] = useState(() => Date.now());

  if (rsos.length === 0) {
    return <p className="text-sm text-muted-foreground">Você ainda não participou de nenhum turno.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rsos.map((rso) => {
        const expandido = expandidoId === rso.id;
        const emServico = !rso.encerradoEm;
        const fimMs = emServico ? agora : new Date(rso.encerradoEm as string).getTime();
        const duracaoMs = fimMs - new Date(rso.iniciadoEm).getTime();

        return (
          <Card key={rso.id} className="shadow-sm">
            <CardHeader
              className="flex-row cursor-pointer items-center justify-between gap-3"
              onClick={() => setExpandidoId(expandido ? null : rso.id)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Badge variant="secondary" className="shrink-0">
                  {rso.prefixo}
                </Badge>
                <span className="min-w-0 truncate text-sm font-medium">{LABEL_TIPO[rso.tipo]}</span>
                {rso.turno && <span className="shrink-0 truncate text-xs text-muted-foreground">· {rso.turno}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={emServico ? "default" : "secondary"}>{emServico ? "Em serviço" : "Encerrado"}</Badge>
                <span className="text-xs text-muted-foreground">{formatarDataHora(rso.iniciadoEm)}</span>
              </div>
            </CardHeader>
            {expandido && (
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">Duração: {formatarDuracao(duracaoMs)}</p>
                {rso.textoFechamento ? (
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs font-mono">
                    {rso.textoFechamento}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Este turno ainda está em andamento — o relatório final aparece aqui depois de fechado.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
