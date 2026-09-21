"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck, ListChecks, BarChart3, CalendarClock, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { SincronizarUsuariosButton } from "@/components/sincronizar-usuarios-button";
import { StatusServicoBadge } from "@/components/status-servico-badge";
import { cn } from "@/lib/utils";

const TITULO = "2BPChoque - Anchieta";

const LINKS = [
  { href: "/", label: "Início", icon: ShieldCheck },
  { href: "/meus-turnos", label: "Meus turnos", icon: CalendarClock },
  { href: "/boletins", label: "Boletins", icon: ListChecks },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

const LINK_ADMIN = { href: "/admin/turnos", label: "Supervisão de turnos", icon: Users2 };

function Logo({ className }: { className?: string }) {
  return <img src="/choque2.png" alt="2º Batalhão de Choque - Anchieta" className={cn("object-contain", className)} />;
}

function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, LINK_ADMIN] : LINKS;

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const ativo = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              ativo
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="text-sm font-semibold tracking-tight">{TITULO}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusServicoBadge />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </Button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-72 max-w-[80%] flex-col gap-6 bg-background p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                <X className="size-5" />
              </Button>
            </div>
            <NavLinks isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto flex flex-col gap-3 border-t border-border/60 pt-4">
              {isAdmin && <SincronizarUsuariosButton />}
            </div>
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border/60 bg-background/60 p-4 md:flex">
        <div className="flex items-center gap-2.5 px-1">
          <Logo className="size-9" />
          <span className="text-sm font-semibold tracking-tight">{TITULO}</span>
        </div>

        <NavLinks isAdmin={isAdmin} />

        {isAdmin && (
          <div className="mt-auto border-t border-border/60 pt-4">
            <SincronizarUsuariosButton />
          </div>
        )}
      </aside>
    </>
  );
}

export function AppTopbar({
  userName,
  userImage,
}: {
  userName?: string | null;
  userImage?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 hidden items-center justify-between border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur-md md:flex">
      <div />
      <div className="flex items-center gap-3">
        <StatusServicoBadge />
        <UserMenu name={userName} image={userImage} />
      </div>
    </header>
  );
}
