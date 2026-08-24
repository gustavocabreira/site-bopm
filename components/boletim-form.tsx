"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import type { EstadoBoletim, Individuo } from "@/lib/boletimEstado";
import type { MaterialApreendido } from "@/lib/materiais";

type Phase = "collecting" | "loading" | "review";

interface ConteudoGerado {
  relato: string;
  natureza: string;
  materiaisApreendidos: MaterialApreendido[];
  artigos: string | null;
  avisos: string[];
}

const EMPTY_FIELDS: BoletimFields = {
  prefixo: "",
  chefeEquipe: "",
  motorista: "",
  homem3: "",
  homem4: "",
  local: "",
  veiculo: "",
  relatoBruto: "",
};

const EMPTY_INDIVIDUO: Individuo = { nome: "", rg: "" };

const SECOES: { titulo: string; chaves: QuestionKey[] }[] = [
  { titulo: "Equipe", chaves: ["prefixo", "chefeEquipe", "motorista", "homem3", "homem4"] },
  { titulo: "Ocorrência", chaves: ["local", "veiculo", "relatoBruto"] },
];

const questionsByKey = Object.fromEntries(QUESTIONS.map((q) => [q.key, q])) as Record<
  QuestionKey,
  (typeof QUESTIONS)[number]
>;

function mostrarAvisos(avisos: string[]) {
  avisos.forEach((aviso) => toast.warning(aviso));
}

/** Remove linhas de indivíduo totalmente em branco (ex.: a linha padrão não preenchida). */
function individuosPreenchidos(lista: Individuo[]): Individuo[] {
  return lista.filter((individuo) => individuo.nome.trim() || individuo.rg.trim());
}

export function BoletimForm() {
  const [fields, setFields] = useState<BoletimFields>(EMPTY_FIELDS);
  const [individuos, setIndividuos] = useState<Individuo[]>([{ ...EMPTY_INDIVIDUO }]);
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

  function adicionarIndividuo() {
    setIndividuos((prev) => [...prev, { ...EMPTY_INDIVIDUO }]);
  }

  function removerIndividuo(index: number) {
    setIndividuos((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIndividuo(index: number, key: keyof Individuo, value: string) {
    setIndividuos((prev) => prev.map((individuo, i) => (i === index ? { ...individuo, [key]: value } : individuo)));
  }

  function validar(): boolean {
    for (const question of QUESTIONS) {
      if (!question.optional && !fields[question.key].trim()) {
        toast.error(`Preencha o campo "${question.label}".`);
        return false;
      }
    }
    for (const individuo of individuos) {
      const temAlgumDado = individuo.nome.trim() || individuo.rg.trim();
      if (temAlgumDado && !individuo.nome.trim()) {
        toast.error("Preencha o nome do indivíduo (ou deixe a linha totalmente em branco).");
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
      const estadoAtual: EstadoBoletim = {
        prefixo: fields.prefixo,
        chefeEquipe: fields.chefeEquipe,
        motorista: fields.motorista,
        homem3: fields.homem3,
        homem4: fields.homem4,
        individuos: individuosPreenchidos(individuos),
        local: fields.local,
        veiculo: fields.veiculo,
        relato: conteudo.relato,
        natureza: conteudo.natureza,
        materiaisApreendidos: conteudo.materiaisApreendidos,
        artigos: conteudo.artigos,
      };

      const res = await fetch("/api/complementar-boletim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoAtual, instrucao: complemento }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao atualizar o boletim.");
        return;
      }

      const estadoAtualizado: EstadoBoletim = data;
      setFields((prev) => ({
        ...prev,
        prefixo: estadoAtualizado.prefixo,
        chefeEquipe: estadoAtualizado.chefeEquipe,
        motorista: estadoAtualizado.motorista,
        homem3: estadoAtualizado.homem3,
        homem4: estadoAtualizado.homem4,
        local: estadoAtualizado.local,
        veiculo: estadoAtualizado.veiculo,
      }));
      setIndividuos(estadoAtualizado.individuos);
      setConteudo({
        relato: estadoAtualizado.relato,
        natureza: estadoAtualizado.natureza,
        materiaisApreendidos: estadoAtualizado.materiaisApreendidos,
        artigos: estadoAtualizado.artigos,
        avisos: [],
      });
      setComplemento("");
      toast.success("Boletim atualizado.");
    } catch {
      toast.error("Falha de conexão ao atualizar o boletim.");
    } finally {
      setEnviandoComplemento(false);
    }
  }

  async function confirmarPublicacao() {
    if (!conteudo || !dataHora) return;
    setConfirmOpen(false);

    const individuosParaSalvar = individuosPreenchidos(individuos);
    const texto = buildBoletimTextoPuro({
      ...fields,
      individuos: individuosParaSalvar,
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
          chefeEquipe: fields.chefeEquipe,
          local: fields.local,
          natureza: conteudo.natureza,
          texto,
          individuos: individuosParaSalvar,
          materiais: conteudo.materiaisApreendidos,
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
      individuos: individuosPreenchidos(individuos),
      data: base.data,
      horario: base.horario,
      natureza: conteudo?.natureza ?? "—",
      materiaisApreendidos: conteudo?.materiaisApreendidos ?? [],
      relato: conteudo?.relato || fields.relatoBruto || "—",
      artigos: conteudo?.artigos ?? "",
    });
  }, [fields, individuos, conteudo, dataHora]);

  async function copiarTexto() {
    if (!conteudo || !dataHora) {
      toast.error("Gere o boletim antes de copiar.");
      return;
    }
    const texto = buildBoletimTextoPuro({
      ...fields,
      individuos: individuosPreenchidos(individuos),
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
    setIndividuos([{ ...EMPTY_INDIVIDUO }]);
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
              {SECOES.map((secao, index) => (
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

                  {index === 0 && (
                    <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                        Indivíduos abordados
                      </h3>
                      {individuos.map((individuo, individuoIndex) => (
                          <div key={individuoIndex} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`individuo-nome-${individuoIndex}`}>
                                Nome e sobrenome {individuos.length > 1 ? `(${individuoIndex + 1})` : ""}
                              </Label>
                              <Input
                                id={`individuo-nome-${individuoIndex}`}
                                placeholder="Nome completo do indivíduo"
                                value={individuo.nome}
                                onChange={(e) => updateIndividuo(individuoIndex, "nome", e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`individuo-rg-${individuoIndex}`}>RG</Label>
                              <Input
                                id={`individuo-rg-${individuoIndex}`}
                                placeholder="Deixe em branco se não houver"
                                value={individuo.rg}
                                onChange={(e) => updateIndividuo(individuoIndex, "rg", e.target.value)}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removerIndividuo(individuoIndex)}
                                aria-label="Remover indivíduo"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit gap-1.5"
                        onClick={adicionarIndividuo}
                      >
                        <Plus className="size-3.5" />
                        Adicionar indivíduo
                      </Button>
                    </div>
                  )}
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
                  <Label htmlFor="complemento">Adicionar informação, corrigir ou trocar qualquer campo</Label>
                  <Textarea
                    id="complemento"
                    placeholder="Ex.: o artigo 155 está errado, deveria ser o 157 / o chefe da equipe está errado, é o Fulano / esqueci de mencionar que também foi apreendida uma balança de precisão"
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
                    {enviandoComplemento ? "Atualizando..." : "Atualizar boletim"}
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
