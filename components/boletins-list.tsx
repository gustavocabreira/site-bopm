"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BoletimSalvo } from "@/lib/boletimStore";

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success("Texto copiado para a área de transferência.");
  } catch {
    toast.error("Não foi possível copiar o texto.");
  }
}

export function BoletinsList({ boletins }: { boletins: BoletimSalvo[] }) {
  if (boletins.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum boletim confirmado ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {boletins.map((boletim) => (
        <Card key={boletim.id} className="shadow-sm">
          <CardHeader className="flex flex-col items-stretch gap-1">
            <div className="flex w-full min-w-0 items-center gap-2">
              <Badge variant="secondary" className="shrink-0">
                {boletim.prefixo}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={boletim.natureza}>
                {boletim.natureza}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatarData(boletim.createdAt)} · {boletim.discordUserName ?? "desconhecido"}
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{boletim.local}</p>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs font-mono">
              {boletim.texto}
            </pre>
            <Button variant="outline" size="sm" className="self-start" onClick={() => copiar(boletim.texto)}>
              Copiar texto
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
