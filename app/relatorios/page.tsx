import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RelatorioApreensoes } from "@/components/relatorio-apreensoes";
import { Button } from "@/components/ui/button";

export default function RelatoriosPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Relatório de apreensões</h1>
      </div>
      <RelatorioApreensoes />
    </div>
  );
}
