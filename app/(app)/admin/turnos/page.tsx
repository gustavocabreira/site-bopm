import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, isAdminUser } from "@/lib/auth";
import { TurnosAdminPanel } from "@/components/turnos-admin-panel";

export const dynamic = "force-dynamic";

export default async function TurnosAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminUser(session.user.id)) {
    redirect("/");
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-lg font-semibold">Supervisão de turnos</h1>
      <TurnosAdminPanel />
    </div>
  );
}
