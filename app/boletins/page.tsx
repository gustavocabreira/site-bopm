import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listBoletins } from "@/lib/boletimStore";
import { BoletinsList } from "@/components/boletins-list";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function BoletinsPage() {
  const boletins = await listBoletins();

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Boletins confirmados</h1>
      </div>
      <BoletinsList boletins={boletins} />
    </div>
  );
}
