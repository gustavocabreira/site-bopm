"use client";

import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, image }: { name?: string | null; image?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarImage src={image ?? undefined} alt={name ?? "Usuário"} />
        <AvatarFallback>{name?.slice(0, 2).toUpperCase() ?? "??"}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium hidden sm:inline">{name}</span>
      <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sair
      </Button>
    </div>
  );
}
