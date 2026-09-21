"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuarnicaoRsoFields } from "@/components/guarnicao-rso-fields";
import { PREFIXOS_VIATURA, type CrewSnapshot, type TipoViatura } from "@/lib/rsoEstado";

type FormularioRso = CrewSnapshot & {
  turno: string;
  viatura: string;
  prefixo: string;
};

const FORMULARIO_VAZIO: FormularioRso = {
  turno: "",
  viatura: "",
  prefixo: "",
  chefeEquipe: "",
  motorista: "",
  homem3: "",
  homem4: "",
  r1Encarregado: "",
  r2ApoioTatico: "",
  r3Interventor: "",
};

export function AbrirRsoForm() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoViatura>("quatro_rodas");
  const [form, setForm] = useState<FormularioRso>(FORMULARIO_VAZIO);
  const [enviando, setEnviando] = useState(false);

  function updateField(key: keyof FormularioRso, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCrewField(campo: keyof CrewSnapshot, valor: string) {
    updateField(campo, valor);
  }

  async function abrirServico() {
    if (!form.turno.trim() || !form.viatura.trim() || !form.prefixo.trim()) {
      toast.error("Preencha turno, viatura e prefixo.");
      return;
    }
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
      const res = await fetch("/api/rso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, ...form }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao abrir o serviço.");
        return;
      }

      toast.success("Serviço aberto.");
      router.refresh();
    } catch {
      toast.error("Falha de conexão ao abrir o serviço.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="w-full max-w-xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Abrir serviço (RSO)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Label>Tipo de viatura</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tipo === "quatro_rodas" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTipo("quatro_rodas")}
            >
              Viatura 4 rodas
            </Button>
            <Button
              type="button"
              variant={tipo === "rocam" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTipo("rocam")}
            >
              ROCAM
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="turno">
              Turno <span className="text-primary">*</span>
            </Label>
            <Input
              id="turno"
              placeholder="Ex.: 07:00"
              value={form.turno}
              onChange={(e) => updateField("turno", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="viatura">
              Viatura <span className="text-primary">*</span>
            </Label>
            <Input
              id="viatura"
              placeholder="Modelo do veículo"
              value={form.viatura}
              onChange={(e) => updateField("viatura", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prefixo">
              Prefixo <span className="text-primary">*</span>
            </Label>
            {tipo === "quatro_rodas" ? (
              <Select
                value={form.prefixo}
                onValueChange={(value) => value && updateField("prefixo", value)}
              >
                <SelectTrigger id="prefixo" className="w-full">
                  <SelectValue placeholder="Selecione o prefixo" />
                </SelectTrigger>
                <SelectContent>
                  {PREFIXOS_VIATURA.map((prefixo) => (
                    <SelectItem key={prefixo} value={prefixo}>
                      {prefixo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="prefixo"
                placeholder="Ex.: M-92"
                value={form.prefixo}
                onChange={(e) => updateField("prefixo", e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Equipe</h3>
          <GuarnicaoRsoFields tipo={tipo} values={form} onChange={updateCrewField} />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" onClick={abrirServico} disabled={enviando}>
          {enviando ? "Abrindo..." : "Abrir serviço"}
        </Button>
      </CardFooter>
    </Card>
  );
}
