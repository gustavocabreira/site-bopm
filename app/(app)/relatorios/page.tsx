import { TurnosHeatmap } from "@/components/turnos-heatmap";

export default function RelatoriosPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-lg font-semibold">Horários de turnos</h1>
      <TurnosHeatmap />
    </div>
  );
}
