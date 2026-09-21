"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GuarnicaoRsoFields } from "@/components/guarnicao-rso-fields";
import type { CrewSnapshot, TipoViatura } from "@/lib/rsoEstado";
import type { MembroGuilda } from "@/lib/membroGuilda";
import { resumoRemodulacoes } from "@/lib/rsoTemplate";

export function RemodulacaoForm({
  rsoId,
  tipo,
  guarnicaoAtual,
  onVoltar,
  onRegistrada,
}: {
  rsoId: string;
  tipo: TipoViatura;
  guarnicaoAtual: CrewSnapshot;
  onVoltar: () => void;
  onRegistrada: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CrewSnapshot>(guarnicaoAtual);
  const [enviando, setEnviando] = useState(false);
  const [membros, setMembros] = useState<MembroGuilda[]>([]);

  useEffect(() => {
    fetch("/api/discord/membros")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.membros)) setMembros(data.membros);
      })
      .catch(() => {});
  }, []);

  function updateField(campo: keyof CrewSnapshot, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function registrar() {
    if (tipo === "quatro_rodas" && (!form.chefeEquipe.trim() || !form.motorista.trim())) {
      toast.error("Preencha o chefe da equipe e o motorista.");
      return;
    }
    if (tipo === "rocam" && (!form.r1Encarregado.trim() || !form.r2ApoioTatico.trim())) {
      toast.error("Preencha R1 e R2.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/rso/${rsoId}/remodulacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao registrar a remodulação.");
        return;
      }

      const mudancas = resumoRemodulacoes(
        [{ trocadoEm: new Date().toISOString(), integrantesAnteriores: guarnicaoAtual, integrantesNovos: form }],
        membros,
      );
      toast.success("Remodulação registrada.", {
        description: mudancas.length > 0 ? mudancas.join(" · ") : undefined,
      });
      router.refresh();
      onRegistrada();
    } catch {
      toast.error("Falha de conexão ao registrar a remodulação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="w-full max-w-xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Remodulação — trocar guarnição</CardTitle>
      </CardHeader>
      <CardContent>
        <GuarnicaoRsoFields tipo={tipo} values={form} onChange={updateField} />
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="ghost" onClick={onVoltar} disabled={enviando}>
          Voltar
        </Button>
        <Button onClick={registrar} disabled={enviando}>
          {enviando ? "Registrando..." : "Registrar remodulação"}
        </Button>
      </CardFooter>
    </Card>
  );
}
