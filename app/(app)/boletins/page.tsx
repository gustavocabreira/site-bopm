import { listBoletins } from "@/lib/boletimStore";
import { BoletinsList } from "@/components/boletins-list";

export const dynamic = "force-dynamic";

export default async function BoletinsPage() {
  const boletins = await listBoletins();

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-lg font-semibold">Boletins confirmados</h1>
      <BoletinsList boletins={boletins} />
    </div>
  );
}
