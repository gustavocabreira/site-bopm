"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { MembroCombobox } from "@/components/membro-combobox";
import type { CrewSnapshot, TipoViatura } from "@/lib/rsoEstado";
import type { MembroGuilda } from "@/lib/guildMembers";

/** Bloco de campos da guarnição de um RSO, usado tanto na abertura do serviço quanto no registro de remodulação. */
export function GuarnicaoRsoFields({
  tipo,
  values,
  onChange,
}: {
  tipo: TipoViatura;
  values: CrewSnapshot;
  onChange: (campo: keyof CrewSnapshot, valor: string) => void;
}) {
  const [membros, setMembros] = useState<MembroGuilda[]>([]);

  useEffect(() => {
    fetch("/api/discord/membros")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.membros)) setMembros(data.membros);
      })
      .catch(() => {});
  }, []);

  if (tipo === "rocam") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r1Encarregado">
            R1 - Encarregado <span className="text-primary">*</span>
          </Label>
          <MembroCombobox
            id="r1Encarregado"
            placeholder="Nome do encarregado"
            value={values.r1Encarregado}
            onChange={(valor) => onChange("r1Encarregado", valor)}
            membros={membros}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r2ApoioTatico">
            R2 - Apoio Tático <span className="text-primary">*</span>
          </Label>
          <MembroCombobox
            id="r2ApoioTatico"
            placeholder="Nome do apoio tático"
            value={values.r2ApoioTatico}
            onChange={(valor) => onChange("r2ApoioTatico", valor)}
            membros={membros}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r3Interventor">R3 - Interventor</Label>
          <MembroCombobox
            id="r3Interventor"
            placeholder="Deixe em branco se não houver"
            value={values.r3Interventor}
            onChange={(valor) => onChange("r3Interventor", valor)}
            membros={membros}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chefeEquipe">
          Chefe da equipe <span className="text-primary">*</span>
        </Label>
        <MembroCombobox
          id="chefeEquipe"
          placeholder="Nome do chefe da equipe"
          value={values.chefeEquipe}
          onChange={(valor) => onChange("chefeEquipe", valor)}
          membros={membros}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="motorista">
          Motorista <span className="text-primary">*</span>
        </Label>
        <MembroCombobox
          id="motorista"
          placeholder="Nome do motorista"
          value={values.motorista}
          onChange={(valor) => onChange("motorista", valor)}
          membros={membros}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="homem3">3° Homem Auxiliar</Label>
        <MembroCombobox
          id="homem3"
          placeholder="Deixe em branco se não houver"
          value={values.homem3}
          onChange={(valor) => onChange("homem3", valor)}
          membros={membros}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="homem4">4° Homem Auxiliar</Label>
        <MembroCombobox
          id="homem4"
          placeholder="Deixe em branco se não houver"
          value={values.homem4}
          onChange={(valor) => onChange("homem4", valor)}
          membros={membros}
        />
      </div>
    </div>
  );
}
