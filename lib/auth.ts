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

async function fetchGuildMember(accessToken: string): Promise<DiscordGuildMember | null> {
  try {
    const res = await fetch(`https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD_ID}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function isGuildMember(accessToken: string): Promise<boolean> {
  return (await fetchGuildMember(accessToken)) !== null;
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
      const member = await fetchGuildMember(account.access_token);
      return member !== null;
    },
    async jwt({ token, profile, account }) {
      if (profile && "id" in profile) {
        token.discordId = profile.id as string;
      }
      if (account?.access_token) {
        const member = await fetchGuildMember(account.access_token);
        const nickname = member?.nick ?? member?.user?.global_name ?? member?.user?.username ?? null;
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
