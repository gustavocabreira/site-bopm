"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5 shrink-0 fill-current" aria-hidden="true">
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.74 19.74 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.09-.32 13.579.099 18.021a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.2 14.2 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.637-3.548-13.625a.06.06 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.211 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.211 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419Z" />
    </svg>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Seu usuário do Discord não tem permissão para acessar este sistema.",
  GuildAccessRevoked: "Você não é mais membro do servidor Discord autorizado. Faça login novamente.",
  Default: "Não foi possível entrar. Tente novamente.",
};

function LoginError() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;

  return (
    <p className="text-sm text-destructive text-center">
      {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default}
    </p>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm border-border/60 shadow-lg">
        <CardHeader className="items-center justify-items-center text-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="size-7" strokeWidth={1.75} />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Boletim de Ocorrência</CardTitle>
            <CardDescription>Entre com sua conta do Discord para emitir um boletim.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full justify-center gap-2.5 bg-[#5865F2] text-white hover:bg-[#4752C4]"
            size="lg"
            onClick={() => signIn("discord", { callbackUrl: "/" })}
          >
            <DiscordIcon />
            <span>Entrar com Discord</span>
          </Button>
          <Suspense fallback={null}>
            <LoginError />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
