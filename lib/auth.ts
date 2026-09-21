import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const REQUIRED_GUILD_ID = "1477840333021778040";

/** IDs Discord com acesso a ações administrativas (ex.: botão "Sincronizar usuários"). */
export const ADMIN_DISCORD_IDS = ["270399024241049600", "684204886572924928"];

export function isAdminUser(discordId: string | null | undefined): boolean {
  return !!discordId && ADMIN_DISCORD_IDS.includes(discordId);
}

interface DiscordGuildMember {
  nick?: string | null;
  user?: { global_name?: string | null; username?: string | null };
}

/**
 * `null` distingue duas coisas: a conta confirmadamente não está na guilda
 * (Discord respondeu 403/404 — cai pro fluxo de "sem acesso"), ou não deu
 * pra confirmar nada (timeout, erro de rede, 5xx/429 da API do Discord —
 * nesse caso falha "aberta": não desloga a pessoa por um problema de rede
 * passageiro). Só o segundo caso usa `indeterminado`.
 */
async function fetchGuildMember(
  accessToken: string,
): Promise<{ membro: DiscordGuildMember | null; indeterminado: boolean }> {
  try {
    const res = await fetch(`https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD_ID}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 403 || res.status === 404) return { membro: null, indeterminado: false };
    if (!res.ok) return { membro: null, indeterminado: true };
    return { membro: await res.json(), indeterminado: false };
  } catch {
    return { membro: null, indeterminado: true };
  }
}

/** Verdadeiro se confirmadamente é membro, ou se não deu pra confirmar (falha de rede não desloga ninguém). */
export async function isGuildMember(accessToken: string): Promise<boolean> {
  const { membro, indeterminado } = await fetchGuildMember(accessToken);
  return membro !== null || indeterminado;
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      httpOptions: { timeout: 15000 },
      authorization: { params: { scope: "identify email guilds.members.read" } },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (!account?.access_token) return false;
      const { membro } = await fetchGuildMember(account.access_token);
      return membro !== null;
    },
    async jwt({ token, profile, account }) {
      if (profile && "id" in profile) {
        token.discordId = profile.id as string;
      }
      if (account?.access_token) {
        const { membro } = await fetchGuildMember(account.access_token);
        const nickname = membro?.nick ?? membro?.user?.global_name ?? membro?.user?.username ?? null;
        if (nickname) token.nickname = nickname;
        token.accessToken = account.access_token;
        token.guildCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.discordId as string;
        if (token.nickname) session.user.name = token.nickname as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
