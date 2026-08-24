"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoletimSalvo } from "@/lib/boletimStore";
import type { Individuo } from "@/lib/boletimEstado";
import { buildBoletimTextoPuro } from "@/lib/boletimTemplate";
import { CATEGORIAS_MATERIAL, UNIDADES_MATERIAL, type MaterialApreendido } from "@/lib/materiais";

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

const selectClass =
  "h-10 rounded-md border border-input/80 bg-input/25 px-2.5 text-sm outline-none focus-visible:border-ring";

interface FormularioEdicao {
  prefixo: string;
  chefeEquipe: string;
  motorista: string;
  homem3: string;
  homem4: string;
  local: string;
  veiculo: string;
  natureza: string;
  relato: string;
  artigos: string;
}

function estadoInicial(boletim: BoletimSalvo): FormularioEdicao {
  return {
    prefixo: boletim.prefixo,
    chefeEquipe: boletim.chefeEquipe ?? "",
    motorista: boletim.motorista ?? "",
    homem3: boletim.homem3 ?? "",
    homem4: boletim.homem4 ?? "",
    local: boletim.local,
    veiculo: boletim.veiculo ?? "",
    natureza: boletim.natureza,
    relato: boletim.relato ?? "",
    artigos: boletim.artigos ?? "",
  };
}

export function BoletinsList({ boletins }: { boletins: BoletimSalvo[] }) {
  const [items, setItems] = useState(boletins);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormularioEdicao | null>(null);
  const [individuosEditados, setIndividuosEditados] = useState<Individuo[]>([]);
  const [materiaisEditados, setMateriaisEditados] = useState<MaterialApreendido[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  function iniciarEdicao(boletim: BoletimSalvo) {
    setEditandoId(boletim.id);
    setForm(estadoInicial(boletim));
    setIndividuosEditados(boletim.individuos);
    setMateriaisEditados(boletim.materiais);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(null);
    setIndividuosEditados([]);
    setMateriaisEditados([]);
  }

  function updateForm(key: keyof FormularioEdicao, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateIndividuo(index: number, key: keyof Individuo, value: string) {
    setIndividuosEditados((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  function updateMaterial(index: number, key: keyof MaterialApreendido, value: string | number) {
    setMateriaisEditados((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  async function salvarEdicao(boletim: BoletimSalvo) {
    if (!form) return;
    if (!form.prefixo.trim() || !form.local.trim() || !form.natureza.trim() || !form.relato.trim()) {
      toast.error("Prefixo, local, natureza e relato não podem ficar vazios.");
      return;
    }

    const individuosValidos = individuosEditados.filter((i) => i.nome.trim() || i.rg.trim());
    const materiaisValidos = materiaisEditados.filter((m) => m.descricao.trim());
    const artigos = form.artigos.trim() || null;

    const texto = buildBoletimTextoPuro({
      data: boletim.data ?? "",
      horario: boletim.horario ?? "",
      prefixo: form.prefixo,
      chefeEquipe: form.chefeEquipe,
      motorista: form.motorista,
      homem3: form.homem3,
      homem4: form.homem4,
      individuos: individuosValidos,
      natureza: form.natureza,
      local: form.local,
      veiculo: form.veiculo,
      materiaisApreendidos: materiaisValidos,
      relato: form.relato,
      artigos,
    });

    setSalvando(true);
    try {
      const res = await fetch(`/api/boletins/${boletim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, artigos, texto, individuos: individuosValidos, materiais: materiaisValidos }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao salvar a edição.");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === boletim.id
            ? { ...item, ...form, artigos, texto, individuos: individuosValidos, materiais: materiaisValidos }
            : item,
        ),
      );
      setEditandoId(null);
      toast.success("Boletim atualizado.");
    } catch {
      toast.error("Falha de conexão ao salvar a edição.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir este boletim? Essa ação não pode ser desfeita.")) return;

    setExcluindoId(id);
    try {
      const res = await fetch(`/api/boletins/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao excluir o boletim.");
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Boletim excluído.");
    } catch {
      toast.error("Falha de conexão ao excluir o boletim.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum boletim confirmado ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((boletim) => {
        const editando = editandoId === boletim.id && form;
        return (
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
              {editando && form ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Prefixo</Label>
                      <Input value={form.prefixo} onChange={(e) => updateForm("prefixo", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Local</Label>
                      <Input value={form.local} onChange={(e) => updateForm("local", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Chefe da equipe</Label>
                      <Input
                        value={form.chefeEquipe}
                        onChange={(e) => updateForm("chefeEquipe", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Motorista</Label>
                      <Input
                        value={form.motorista}
                        onChange={(e) => updateForm("motorista", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">3° Homem</Label>
                      <Input value={form.homem3} onChange={(e) => updateForm("homem3", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">4° Homem</Label>
                      <Input value={form.homem4} onChange={(e) => updateForm("homem4", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Veículo</Label>
                      <Input value={form.veiculo} onChange={(e) => updateForm("veiculo", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Natureza</Label>
                      <Input
                        value={form.natureza}
                        onChange={(e) => updateForm("natureza", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Relato</Label>
                    <Textarea
                      value={form.relato}
                      onChange={(e) => updateForm("relato", e.target.value)}
                      rows={6}
                      className="text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Artigos (um por linha)</Label>
                    <Textarea
                      value={form.artigos}
                      onChange={(e) => updateForm("artigos", e.target.value)}
                      rows={3}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Indivíduos</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => setIndividuosEditados((prev) => [...prev, { nome: "", rg: "" }])}
                      >
                        <Plus className="size-3" />
                        Adicionar
                      </Button>
                    </div>
                    {individuosEditados.map((individuo, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input
                          placeholder="Nome"
                          value={individuo.nome}
                          onChange={(e) => updateIndividuo(index, "nome", e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="RG"
                          value={individuo.rg}
                          onChange={(e) => updateIndividuo(index, "rg", e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setIndividuosEditados((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Materiais apreendidos</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() =>
                          setMateriaisEditados((prev) => [
                            ...prev,
                            { categoria: "Outro", quantidade: 1, unidade: "unidade(s)", descricao: "" },
                          ])
                        }
                      >
                        <Plus className="size-3" />
                        Adicionar
                      </Button>
                    </div>
                    {materiaisEditados.map((material, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2 rounded-md border border-border/60 p-2">
                        <select
                          className={selectClass}
                          value={material.categoria}
                          onChange={(e) => updateMaterial(index, "categoria", e.target.value)}
                        >
                          {CATEGORIAS_MATERIAL.map((categoria) => (
                            <option key={categoria} value={categoria}>
                              {categoria}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="any"
                            value={material.quantidade}
                            onChange={(e) => updateMaterial(index, "quantidade", Number(e.target.value))}
                            className="h-10 text-xs"
                          />
                          <select
                            className={selectClass}
                            value={material.unidade}
                            onChange={(e) => updateMaterial(index, "unidade", e.target.value)}
                          >
                            {UNIDADES_MATERIAL.map((unidade) => (
                              <option key={unidade} value={unidade}>
                                {unidade}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Input
                          placeholder="Descrição"
                          value={material.descricao}
                          onChange={(e) => updateMaterial(index, "descricao", e.target.value)}
                          className="col-span-2 h-8 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="col-span-2 h-7 gap-1 self-start text-xs text-destructive hover:text-destructive"
                          onClick={() => setMateriaisEditados((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="size-3.5" />
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{boletim.local}</p>
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs font-mono">
                    {boletim.texto}
                  </pre>
                </>
              )}

              <div className="flex flex-wrap gap-2">
                {editando ? (
                  <>
                    <Button size="sm" onClick={() => salvarEdicao(boletim)} disabled={salvando}>
                      {salvando ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelarEdicao} disabled={salvando}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => copiar(boletim.texto)}>
                      Copiar texto
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => iniciarEdicao(boletim)}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => excluir(boletim.id)}
                      disabled={excluindoId === boletim.id}
                    >
                      {excluindoId === boletim.id ? "Excluindo..." : "Excluir"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
