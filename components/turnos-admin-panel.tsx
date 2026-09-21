"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/date-range-picker";
import { MembroCombobox } from "@/components/membro-combobox";
import { BoletinsList } from "@/components/boletins-list";
import { nomeDoMembro } from "@/lib/resolverNome";
import { MEMBROS_SINCRONIZADOS_EVENT } from "@/lib/membrosSyncEvent";
import type { MembroGuilda } from "@/lib/membroGuilda";
import type { RsoSalvo } from "@/lib/rsoStore";
import type { BoletimSalvo } from "@/lib/boletimStore";

type StatusFiltro = "todos" | "aberto" | "fechado";

type TurnoComBoletins = RsoSalvo & { boletins: BoletimSalvo[] };

const LABEL_TIPO: Record<RsoSalvo["tipo"], string> = {
  quatro_rodas: "Viatura 4 rodas",
  rocam: "ROCAM",
};

function diasAtras(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data;
}

function formatarDataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function guarnicaoDoTurno(rso: RsoSalvo, membros: MembroGuilda[]): string {
  const postos =
    rso.tipo === "rocam"
      ? [rso.r1Encarregado, rso.r2ApoioTatico, rso.r3Interventor]
      : [rso.chefeEquipe, rso.motorista, rso.homem3, rso.homem4];

  return postos
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id))
    .map((id) => nomeDoMembro(id, membros))
    .join(", ");
}

export function TurnosAdminPanel() {
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [from, setFrom] = useState(diasAtras(30));
  const [to, setTo] = useState(new Date());
  const [policial, setPolicial] = useState("");
  const [membros, setMembros] = useState<MembroGuilda[]>([]);
  const [turnos, setTurnos] = useState<TurnoComBoletins[]>([]);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    function carregarMembros() {
      fetch("/api/discord/membros")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.membros)) setMembros(data.membros);
        })
        .catch(() => {});
    }
    carregarMembros();
    window.addEventListener(MEMBROS_SINCRONIZADOS_EVENT, carregarMembros);
    return () => window.removeEventListener(MEMBROS_SINCRONIZADOS_EVENT, carregarMembros);
  }, []);

  useEffect(() => {
    buscarTurnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscarTurnos(overrides?: {
    status?: StatusFiltro;
    from?: Date;
    to?: Date;
    policial?: string;
  }) {
    const statusAtivo = overrides?.status ?? status;
    const fromAtivo = overrides?.from ?? from;
    const toAtivo = overrides?.to ?? to;
    const policialAtivo = overrides?.policial ?? policial;

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
      if (statusAtivo !== "todos") params.set("status", statusAtivo);
      if (policialAtivo) params.set("policial", policialAtivo);

      const res = await fetch(`/api/admin/turnos?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao buscar os turnos.");
        return;
      }

      setTurnos(data.turnos ?? []);
    } catch {
      toast.error("Falha de conexão ao buscar os turnos.");
    } finally {
      setCarregando(false);
    }
  }

  function onStatusChange(value: string | null) {
    const novoValor = (value as StatusFiltro) ?? "todos";
    setStatus(novoValor);
    buscarTurnos({ status: novoValor });
  }

  function onPeriodoChange(range: { from: Date; to: Date }) {
    setFrom(range.from);
    setTo(range.to);
    buscarTurnos({ from: range.from, to: range.to });
  }

  function onPolicialChange(valor: string) {
    setPolicial(valor);
    buscarTurnos({ policial: valor });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <Label className="text-sm font-semibold">Filtros</Label>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Em serviço</SelectItem>
                <SelectItem value="fechado">Encerrados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Período</Label>
            <DateRangePicker from={from} to={to} onChange={onPeriodoChange} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Policial</Label>
            <MembroCombobox
              value={policial}
              onChange={onPolicialChange}
              membros={membros}
              placeholder="Todos"
            />
          </div>
        </CardContent>
      </Card>

      {carregando ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : turnos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum turno encontrado com esses filtros.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {turnos.map((turno) => {
            const expandido = expandidoId === turno.id;
            const emServico = !turno.encerradoEm;

            return (
              <Card key={turno.id} className="shadow-sm">
                <CardHeader
                  className="flex-row cursor-pointer flex-wrap items-center justify-between gap-3"
                  onClick={() => setExpandidoId(expandido ? null : turno.id)}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge variant="secondary" className="shrink-0">
                        {turno.prefixo}
                      </Badge>
                      <span className="min-w-0 truncate text-sm font-medium">{LABEL_TIPO[turno.tipo]}</span>
                      {turno.turno && (
                        <span className="shrink-0 truncate text-xs text-muted-foreground">· {turno.turno}</span>
                      )}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {guarnicaoDoTurno(turno, membros) || "Guarnição não informada"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{turno.boletins.length} BOPM(s)</Badge>
                    <Badge variant={emServico ? "default" : "secondary"}>
                      {emServico ? "Em serviço" : "Encerrado"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatarDataHora(turno.iniciadoEm)}</span>
                  </div>
                </CardHeader>
                {expandido && (
                  <CardContent className="flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground">
                      Aberto por {nomeDoMembro(turno.discordUserId, membros) || turno.discordUserName || "desconhecido"}
                      {turno.encerradoEm && ` · Encerrado em ${formatarDataHora(turno.encerradoEm)}`}
                    </p>
                    {turno.textoFechamento && (
                      <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs font-mono">
                        {turno.textoFechamento}
                      </pre>
                    )}
                    {turno.boletins.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum BOPM feito neste turno.</p>
                    ) : (
                      <BoletinsList boletins={turno.boletins} />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
