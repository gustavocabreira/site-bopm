"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatarDuracao } from "@/lib/dateFormatter";

/**
 * Indicador fixo de "em serviço" com o tempo de serviço ao vivo. Fica no
 * header de todas as páginas (não só na tela inicial) para o policial nunca
 * perder a noção de que o RSO está em aberto enquanto navega pelo site.
 */
export function StatusServicoBadge() {
  const [iniciadoEm, setIniciadoEm] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/rso/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIniciadoEm(data?.iniciadoEm ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!iniciadoEm) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [iniciadoEm]);

  if (!iniciadoEm) return null;

  return (
    <Badge variant="secondary" className="gap-1.5 tabular-nums">
      <Clock className="size-3.5" />
      Em serviço · {formatarDuracao(agora - new Date(iniciadoEm).getTime())}
    </Badge>
  );
}
