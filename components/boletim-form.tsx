"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { QUESTIONS, CREW_KEYS, type BoletimFields, type QuestionKey } from "@/lib/questions";
import { buildBoletim, buildBoletimTextoPuro } from "@/lib/boletimTemplate";
import { getDataHoraAtual } from "@/lib/dateFormatter";

type Phase = "collecting" | "loading" | "review";

interface ConteudoGerado {
  relato: string;
  natureza: string;
  materiaisApreendidos: string | null;
  artigos: string | null;
  avisos: string[];
}

const EMPTY_FIELDS: BoletimFields = {
  prefixo: "",
  chefeEquipe: "",
  motorista: "",
  homem3: "",
  homem4: "",
  individuoNome: "",
  individuoRG: "",
  local: "",
  veiculo: "",
  relatoBruto: "",
};

const SECOES: { titulo: string; chaves: QuestionKey[] }[] = [
  { titulo: "Equipe", chaves: ["prefixo", "chefeEquipe", "motorista", "homem3", "homem4"] },
  { titulo: "Indivíduo abordado", chaves: ["individuoNome", "individuoRG"] },
  { titulo: "Ocorrência", chaves: ["local", "veiculo", "relatoBruto"] },
];

const questionsByKey = Object.fromEntries(QUESTIONS.map((q) => [q.key, q])) as Record<
  QuestionKey,
  (typeof QUESTIONS)[number]
>;

function mostrarAvisos(avisos: string[]) {
  avisos.forEach((aviso) => toast.warning(aviso));
}

export function BoletimForm() {
  const [fields, setFields] = useState<BoletimFields>(EMPTY_FIELDS);
  const [phase, setPhase] = useState<Phase>("collecting");
  const [conteudo, setConteudo] = useState<ConteudoGerado | null>(null);
  const [dataHora, setDataHora] = useState<{ data: string; horario: string } | null>(null);
  const [complemento, setComplemento] = useState("");
  const [enviandoComplemento, setEnviandoComplemento] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publicado, setPublicado] = useState(false);

  useEffect(() => {
    fetch("/api/crew")
      .then((res) => res.json())
      .then((data) => {
        if (data.crew) {
          setFields((prev) => ({ ...prev, ...data.crew }));
          toast.info("Dados da última guarnição carregados.");
        }
      })
      .catch(() => {});
  }, []);

  function updateField(key: QuestionKey, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function validar(): boolean {
    for (const question of QUESTIONS) {
      if (!question.optional && !fields[question.key].trim()) {
        toast.error(`Preencha o campo "${question.label}".`);
        return false;
      }
    }
    return true;
  }

  async function gerarBoletim() {
    if (!validar()) return;

    setPhase("loading");
    try {
      const res = await fetch("/api/gerar-boletim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatoBruto: fields.relatoBruto }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao gerar o boletim.");
        setPhase("collecting");
        return;
      }

      setConteudo(data);
      setDataHora(getDataHoraAtual());
      mostrarAvisos(data.avisos ?? []);
      setPhase("review");
    } catch {
      toast.error("Falha de conexão ao gerar o boletim.");
      setPhase("collecting");
    }
  }

  async function enviarComplemento() {
    if (!complemento.trim() || !conteudo) return;

    setEnviandoComplemento(true);
    try {
      const res = await fetch("/api/complementar-boletim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatoAtual: conteudo.relato, complemento }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao atualizar o relatório.");
        return;
      }

      setConteudo(data);
      mostrarAvisos(data.avisos ?? []);
      setComplemento("");
      toast.success("Relatório atualizado.");
    } catch {
      toast.error("Falha de conexão ao atualizar o relatório.");
    } finally {
      setEnviandoComplemento(false);
    }
  }

  async function confirmarPublicacao() {
    if (!conteudo || !dataHora) return;
    setConfirmOpen(false);

    const texto = buildBoletimTextoPuro({
      ...fields,
      data: dataHora.data,
      horario: dataHora.horario,
      natureza: conteudo.natureza,
      materiaisApreendidos: conteudo.materiaisApreendidos,
      relato: conteudo.relato,
      artigos: conteudo.artigos,
    });

    await Promise.all([
      fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefixo: fields.prefixo,
          chefeEquipe: fields.chefeEquipe,
          motorista: fields.motorista,
          homem3: fields.homem3,
          homem4: fields.homem4,
        }),
      }).catch(() => {}),
      fetch("/api/boletins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefixo: fields.prefixo,
          local: fields.local,
          natureza: conteudo.natureza,
          texto,
        }),
      }).catch(() => {}),
    ]);

    setPublicado(true);
    toast.success("Boletim confirmado.");
  }

  const previewTexto = useMemo(() => {
    const base = dataHora ?? { data: "__/__/____", horario: "__:__" };
    return buildBoletim({
      ...fields,
      data: base.data,
      horario: base.horario,
      natureza: conteudo?.natureza ?? "—",
      materiaisApreendidos: conteudo?.materiaisApreendidos ?? "",
      relato: conteudo?.relato || fields.relatoBruto || "—",
      artigos: conteudo?.artigos ?? "",
    });
  }, [fields, conteudo, dataHora]);

  async function copiarTexto() {
    if (!conteudo || !dataHora) {
      toast.error("Gere o boletim antes de copiar.");
      return;
    }
    const texto = buildBoletimTextoPuro({
      ...fields,
      data: dataHora.data,
      horario: dataHora.horario,
      natureza: conteudo.natureza,
      materiaisApreendidos: conteudo.materiaisApreendidos,
      relato: conteudo.relato,
      artigos: conteudo.artigos,
    });

    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Texto copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o texto.");
    }
  }

  function novoBoletim() {
    const crewPrefill = Object.fromEntries(CREW_KEYS.map((key) => [key, fields[key]]));
    setFields({ ...EMPTY_FIELDS, ...crewPrefill });
    setConteudo(null);
    setDataHora(null);
    setPublicado(false);
    setPhase("collecting");
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2 xl:grid-cols-[5fr_4fr]">
      <Card className="gap-6 border-border/60 shadow-sm">
        {phase === "loading" && (
          <>
            <CardHeader>
              <CardTitle>Gerando relatório...</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </>
        )}

        {phase === "collecting" && (
          <>
            <CardHeader>
              <CardTitle>Emissão de Boletim de Ocorrência</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-7">
              {SECOES.map((secao) => (
                <div key={secao.titulo} className="flex flex-col gap-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {secao.titulo}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {secao.chaves.map((key) => {
                      const question = questionsByKey[key];
                      return (
                        <div
                          key={question.key}
                          className={`flex flex-col gap-1.5 ${question.multiline ? "sm:col-span-2" : ""}`}
                        >
                          <Label htmlFor={question.key}>
                            {question.label}
                            {!question.optional && <span className="text-primary"> *</span>}
                          </Label>
                          {question.multiline ? (
                            <Textarea
                              id={question.key}
                              placeholder={question.placeholder}
                              value={fields[question.key]}
                              onChange={(e) => updateField(question.key, e.target.value)}
                              rows={6}
                            />
                          ) : (
                            <Input
                              id={question.key}
                              placeholder={question.placeholder}
                              value={fields[question.key]}
                              onChange={(e) => updateField(question.key, e.target.value)}
                            />
                          )}
                          {question.helpText && (
                            <p className="text-xs text-muted-foreground">{question.helpText}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={gerarBoletim}>
                Gerar boletim
              </Button>
            </CardFooter>
          </>
        )}

        {phase === "review" && conteudo && (
          <>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Revisão</CardTitle>
                {publicado && <Badge>Confirmado</Badge>}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!publicado && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="complemento">Adicionar informação complementar ou correção</Label>
                  <Textarea
                    id="complemento"
                    placeholder="Ex.: esqueci de mencionar que também foi apreendida uma balança de precisão"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    rows={4}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={enviarComplemento}
                    disabled={enviandoComplemento || !complemento.trim()}
                    className="self-start"
                  >
                    {enviandoComplemento ? "Atualizando..." : "Atualizar relatório"}
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              {!publicado ? (
                <>
                  <Button variant="ghost" onClick={novoBoletim}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setConfirmOpen(true)}>Confirmar boletim</Button>
                </>
              ) : (
                <Button onClick={novoBoletim}>Novo boletim</Button>
              )}
            </CardFooter>
          </>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar publicação do boletim?</AlertDialogTitle>
              <AlertDialogDescription>
                Os dados da guarnição (prefixo, chefe de equipe, motorista e auxiliares) serão salvos para
                reaproveitar no próximo boletim.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmarPublicacao}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Prévia do documento
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
