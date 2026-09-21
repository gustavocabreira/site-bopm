import { RelatorioApreensoes } from "@/components/relatorio-apreensoes";

export default function RelatoriosPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-lg font-semibold">Relatório de apreensões</h1>
      <RelatorioApreensoes />
    </div>
  );
}
