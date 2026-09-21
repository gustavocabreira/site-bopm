import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, isAdminUser } from "@/lib/auth";
import { AppSidebar, AppTopbar } from "@/components/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const admin = isAdminUser(session.user.id);

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <AppSidebar isAdmin={admin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar userName={session.user.name} userImage={session.user.image} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
