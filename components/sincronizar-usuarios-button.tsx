"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SincronizarUsuariosButton() {
  const [sincronizando, setSincronizando] = useState(false);

  async function sincronizar() {
    setSincronizando(true);
    try {
      const res = await fetch("/api/discord/sincronizar-membros", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao sincronizar usuários.");
        return;
      }

      toast.success(`Usuários sincronizados: ${data.comCargo} de ${data.total}.`);
    } catch {
      toast.error("Falha de conexão ao sincronizar usuários.");
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      disabled={sincronizando}
      onClick={sincronizar}
    >
      <RefreshCw className={`size-4 ${sincronizando ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Sincronizar usuários</span>
    </Button>
  );
}
