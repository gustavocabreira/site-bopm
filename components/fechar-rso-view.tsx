"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDataHoraAtual } from "@/lib/dateFormatter";
import { calcularProdutividadeAutomatica } from "@/lib/rsoProdutividade";
import { buildRso, type BopmDoServico } from "@/lib/rsoTemplate";
import type { EstadoRso, Remodulacao } from "@/lib/rsoEstado";
import type { BoletimSalvo } from "@/lib/boletimStore";
import type { RsoSalvo } from "@/lib/rsoStore";

/** Separa "HH:MM às HH:MM" em início/fim — RSOs antigos podem ter só o início salvo (sem " às "), nesse caso o fim volta vazio. */
function parseTurno(turno: string): { inicio: string; fim: string } {
  const [inicio = "", fim = ""] = turno.split(/\s+às\s+/i);
  return { inicio: inicio.trim(), fim: fim.trim() };
}

function formatarTurno(inicio: string, fim: string): string {
  return fim ? `${inicio} às ${fim}` : inicio;
}

function estadoInicial(rso: RsoSalvo, boletins: BoletimSalvo[]): EstadoRso {
  return {
    tipo: rso.tipo,
    data: getDataHoraAtual().data,
    turno: rso.turno,
    viatura: rso.viatura,
    prefixo: rso.prefixo,
    chefeEquipe: rso.chefeEquipe,
    motorista: rso.motorista,
    homem3: rso.homem3,
    homem4: rso.homem4,
    r1Encarregado: rso.r1Encarregado,
    r2ApoioTatico: rso.r2ApoioTatico,
    r3Interventor: rso.r3Interventor,
    ...calcularProdutividadeAutomatica(boletins),
  };
}

export function FecharRsoView({
  rso,
  boletins,
  remodulacoes,
  onCancelar,
}: {
  rso: RsoSalvo;
  boletins: BoletimSalvo[];
  remodulacoes: Remodulacao[];
  onCancelar: () => void;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoRso>(() => estadoInicial(rso, boletins));
  const [instrucao, setInstrucao] = useState("");
  const [atualizando, setAtualizando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [numerosBopm, setNumerosBopm] = useState<Record<string, string>>(() =>
    Object.fromEntries(boletins.map((boletim) => [boletim.id, boletim.numeroSistema ?? ""])),
  );

  const { inicio: inicioTurno, fim: fimTurno } = useMemo(() => parseTurno(estado.turno), [estado.turno]);

  function atualizarInicioTurno(valor: string) {
    setEstado((prev) => ({ ...prev, turno: formatarTurno(valor, parseTurno(prev.turno).fim) }));
  }

  function atualizarFimTurno(valor: string) {
    setEstado((prev) => ({ ...prev, turno: formatarTurno(parseTurno(prev.turno).inicio, valor) }));
  }

  const bopmsParaTemplate: BopmDoServico[] = boletins.map((boletim) => ({
    natureza: boletim.natureza,
    numeroSistema: numerosBopm[boletim.id] ?? null,
  }));

  const previewTexto = useMemo(
    () => buildRso(estado, remodulacoes, bopmsParaTemplate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estado, remodulacoes, numerosBopm],
  );

  async function atualizarComIA() {
    if (!instrucao.trim()) return;

    setAtualizando(true);
    try {
      const res = await fetch("/api/complementar-rso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoAtual: estado, instrucao }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao atualizar o RSO.");
        return;
      }

      setEstado(data as EstadoRso);
      setInstrucao("");
      toast.success("RSO atualizado.");
    } catch {
      toast.error("Falha de conexão ao atualizar o RSO.");
    } finally {
      setAtualizando(false);
    }
  }

  async function confirmarFechamento() {
    setConfirmOpen(false);
    setConfirmando(true);
    try {
      const res = await fetch(`/api/rso/${rso.id}/fechar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, texto: previewTexto, numerosBopm }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao fechar o serviço.");
        return;
      }

      toast.success("Serviço encerrado.");
      router.refresh();
    } catch {
      toast.error("Falha de conexão ao fechar o serviço.");
    } finally {
      setConfirmando(false);
    }
  }

  async function copiarTexto() {
    try {
      await navigator.clipboard.writeText(previewTexto);
      toast.success("Texto copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o texto.");
    }
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2 xl:grid-cols-[5fr_4fr]">
      <Card className="gap-6 border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Fechar serviço</CardTitle>
        </CardHeader>
        {boletins.length > 0 && (
          <CardContent className="flex flex-col gap-3 border-b border-border/60 pb-5">
            <Label>Números dos BOPMs no sistema da cidade</Label>
            {boletins.map((boletim) => (
              <div key={boletim.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <span className="min-w-0 truncate text-sm text-muted-foreground" title={boletim.natureza}>
                  {boletim.prefixo} — {boletim.natureza}
                </span>
                <Input
                  placeholder="Nº no sistema"
                  className="w-36"
                  value={numerosBopm[boletim.id] ?? ""}
                  onChange={(e) => setNumerosBopm((prev) => ({ ...prev, [boletim.id]: e.target.value }))}
                />
              </div>
            ))}
          </CardContent>
        )}
        <CardContent className="grid grid-cols-2 gap-4 border-b border-border/60 pb-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="turno-inicio">Início do turno</Label>
            <Input
              id="turno-inicio"
              placeholder="Ex.: 07:00"
              value={inicioTurno}
              onChange={(e) => atualizarInicioTurno(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="turno-fim">Fim do turno</Label>
            <Input
              id="turno-fim"
              placeholder="Ex.: 19:00"
              value={fimTurno}
              onChange={(e) => atualizarFimTurno(e.target.value)}
            />
          </div>
        </CardContent>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="instrucao-rso">Ajustar produtividade ou qualquer dado, em linguagem natural</Label>
          <Textarea
            id="instrucao-rso"
            placeholder="Ex.: vistoriei 4 carros e 1 moto, tivemos um flagrante de porte de droga"
            value={instrucao}
            onChange={(e) => setInstrucao(e.target.value)}
            rows={4}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={atualizarComIA}
            disabled={atualizando || !instrucao.trim()}
            className="self-start"
          >
            {atualizando ? "Atualizando..." : "Atualizar RSO"}
          </Button>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="ghost" onClick={onCancelar} disabled={confirmando}>
            Cancelar
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={confirmando}>
            {confirmando ? "Fechando..." : "Confirmar fechamento"}
          </Button>
        </CardFooter>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar o serviço?</AlertDialogTitle>
              <AlertDialogDescription>
                O RSO será fechado com a produtividade e os dados mostrados na prévia. Depois de confirmar não é
                possível reabrir este serviço nem criar novos BOPMs nele.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmarFechamento}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Prévia do relatório
          </h3>
          <Button variant="outline" size="sm" onClick={copiarTexto}>
            Copiar
          </Button>
        </div>
        <pre className="min-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 p-5 text-sm font-mono leading-relaxed shadow-inner lg:max-h-[calc(100vh-7rem)]">
          {previewTexto}
        </pre>
      </div>
    </div>
  );
}
