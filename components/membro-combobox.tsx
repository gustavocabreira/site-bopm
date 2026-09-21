"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { nomeDoMembro } from "@/lib/resolverNome";
import type { MembroGuilda } from "@/lib/membroGuilda";

/**
 * Seleção do integrante pelo ID da conta do Discord — nunca texto livre,
 * pra não perder o vínculo com a conta real quando o apelido mudar. O botão
 * mostra o nome atual resolvido a partir do ID guardado; a busca (dentro do
 * Command) filtra pelo nome, mas o valor salvo é sempre o ID.
 */
export function MembroCombobox({
  id,
  value,
  onChange,
  membros,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (valor: string) => void;
  membros: MembroGuilda[];
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const nomeExibido = value ? nomeDoMembro(value, membros) : "";

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger render={<Button id={id} type="button" variant="outline" className="w-full justify-between font-normal" />}>
        <span className={cn("truncate", !nomeExibido && "text-muted-foreground")}>
          {nomeExibido || placeholder || "Selecionar..."}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Buscar membro..." />
          <CommandList>
            <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__limpar__"
                  className="text-muted-foreground"
                  onSelect={() => {
                    onChange("");
                    setAberto(false);
                  }}
                >
                  <X className="size-3.5" />
                  Limpar seleção
                </CommandItem>
              )}
              {membros.map((membro) => (
                <CommandItem
                  key={membro.id}
                  value={membro.nome}
                  onSelect={() => {
                    onChange(membro.id);
                    setAberto(false);
                  }}
                >
                  <Check className={cn("size-3.5", membro.id === value ? "opacity-100" : "opacity-0")} />
                  {membro.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
