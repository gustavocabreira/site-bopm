"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Repeat, StopCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BoletimForm } from "@/components/boletim-form";
import { RemodulacaoForm } from "@/components/remodulacao-form";
import { FecharRsoView } from "@/components/fechar-rso-view";
import { formatarDuracao } from "@/lib/dateFormatter";
import { resumoRemodulacoes } from "@/lib/rsoTemplate";
import type { BoletimFields } from "@/lib/questions";
import type { CrewSnapshot, Remodulacao } from "@/lib/rsoEstado";
import type { BoletimSalvo } from "@/lib/boletimStore";
import type { RsoSalvo } from "@/lib/rsoStore";
import type { MembroGuilda } from "@/lib/membroGuilda";
import { MEMBROS_SINCRONIZADOS_EVENT } from "@/lib/membrosSyncEvent";

type Tela = "widgets" | "novo-bopm" | "remodulacao" | "fechar";

function guarnicaoAtualDoRso(rso: RsoSalvo): CrewSnapshot {
  return {
    chefeEquipe: rso.chefeEquipe,
    motorista: rso.motorista,
    homem3: rso.homem3,
    homem4: rso.homem4,
    r1Encarregado: rso.r1Encarregado,
    r2ApoioTatico: rso.r2ApoioTatico,
    r3Interventor: rso.r3Interventor,
  };
}

/** Mapeia a guarnição do RSO para os campos de equipe do BOPM — no ROCAM, R1/R2/R3 assumem os papéis de chefe/motorista/3º homem para não precisar mudar o template do BOPM. */
function crewPrefillDoRso(rso: RsoSalvo): Partial<BoletimFields> {
  if (rso.tipo === "rocam") {
    return {
      prefixo: rso.prefixo,
      chefeEquipe: rso.r1Encarregado,
      motorista: rso.r2ApoioTatico,
      homem3: rso.r3Interventor,
      homem4: "",
    };
  }
  return {
    prefixo: rso.prefixo,
    chefeEquipe: rso.chefeEquipe,
    motorista: rso.motorista,
    homem3: rso.homem3,
    homem4: rso.homem4,
  };
}

export function ServicoAtivo({
  rso: rsoInicial,
  boletins: boletinsInicial,
  remodulacoes: remodulacoesInicial,
}: {
  rso: RsoSalvo;
  boletins: BoletimSalvo[];
  remodulacoes: Remodulacao[];
}) {
  const router = useRouter();
  const [rso, setRso] = useState(rsoInicial);
  const [boletins, setBoletins] = useState(boletinsInicial);
  const [remodulacoes, setRemodulacoes] = useState(remodulacoesInicial);
  const [tela, setTela] = useState<Tela>("widgets");
  const [agora, setAgora] = useState(() => Date.now());
  const [bopmExpandido, setBopmExpandido] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [membros, setMembros] = useState<MembroGuilda[]>([]);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  /**
   * Busca o RSO/boletins/remodulações direto da API antes de trocar de tela,
   * em vez de confiar no timing do router.refresh() (que é fire-and-forget e
   * pode não ter atualizado os props do server component ainda quando a
   * próxima tela monta e captura o estado inicial — causava produtividade e
   * contagem de BOPMs desatualizadas no fechamento do RSO).
   */
  async function sincronizarServico() {
    setSincronizando(true);
    try {
      const res = await fetch("/api/rso");
      const data = await res.json();
      if (data.rso) setRso(data.rso);
      if (Array.isArray(data.boletins)) setBoletins(data.boletins);
      if (Array.isArray(data.remodulacoes)) setRemodulacoes(data.remodulacoes);
    } catch {
      // mantém os dados atuais em caso de falha de rede
    } finally {
      setSincronizando(false);
    }
    router.refresh();
  }

  if (tela === "novo-bopm") {
    return (
      <div className="flex w-full flex-col gap-4">
        <Button variant="ghost" className="w-fit gap-1.5" onClick={() => setTela("widgets")}>
          ← Voltar para o serviço
        </Button>
        <BoletimForm
          rso={{ id: rso.id, crew: crewPrefillDoRso(rso), tipo: rso.tipo }}
          onPublicado={async () => {
            await sincronizarServico();
            setTela("widgets");
          }}
        />
      </div>
    );
  }

  if (tela === "remodulacao") {
    return (
      <div className="flex w-full justify-center">
        <RemodulacaoForm
          rsoId={rso.id}
          tipo={rso.tipo}
          guarnicaoAtual={guarnicaoAtualDoRso(rso)}
          onVoltar={() => setTela("widgets")}
          onRegistrada={async () => {
            await sincronizarServico();
            setTela("widgets");
          }}
        />
      </div>
    );
  }

  if (tela === "fechar") {
    return (
      <FecharRsoView rso={rso} boletins={boletins} remodulacoes={remodulacoes} onCancelar={() => setTela("widgets")} />
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>Em serviço</Badge>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo de serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-2xl font-semibold tabular-nums">
              {formatarDuracao(agora - new Date(rso.iniciadoEm).getTime())}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">BOPMs no serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold">{boletins.length}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button className="gap-2" onClick={() => setTela("novo-bopm")}>
          <Plus className="size-4" />
          Novo BOPM
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setTela("remodulacao")}>
          <Repeat className="size-4" />
          Remodulação
        </Button>
        <Button
          variant="destructive"
          className="ml-auto gap-2"
          disabled={sincronizando}
          onClick={async () => {
            await sincronizarServico();
            setTela("fechar");
          }}
        >
          <StopCircle className="size-4" />
          {sincronizando ? "Abrindo..." : "Fechar serviço"}
        </Button>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">BOPMs deste serviço</CardTitle>
        </CardHeader>
        <CardContent>
          {boletins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum BOPM feito ainda neste serviço.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {boletins.map((boletim) => {
                const expandido = bopmExpandido === boletim.id;
                return (
                  <li key={boletim.id} className="rounded-md border border-transparent">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md p-1.5 text-left text-sm hover:bg-muted/50"
                      onClick={() => setBopmExpandido(expandido ? null : boletim.id)}
                    >
                      <Badge variant="secondary" className="shrink-0">
                        {boletim.prefixo}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate">{boletim.natureza}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {boletim.data} {boletim.horario}
                      </span>
                    </button>
                    {expandido && (
                      <pre className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 p-3 text-xs font-mono leading-relaxed">
                        {boletim.texto}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {remodulacoes.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Remodulações deste serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm">
              {resumoRemodulacoes(remodulacoes, membros).map((linha, index) => (
                <li key={index} className="text-muted-foreground">
                  {linha}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
