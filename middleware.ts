import { getToken, encode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isGuildMember } from "@/lib/auth";

// How often (ms) middleware re-checks Discord guild membership for an
// already-signed-in user. Keeps us from calling the Discord API on every
// single request while still logging out users shortly after they lose
// access to the required guild.
const GUILD_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const SESSION_COOKIE_NAME = "next-auth.session-token";
const SECURE_SESSION_COOKIE_NAME = "__Secure-next-auth.session-token";

function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(SECURE_SESSION_COOKIE_NAME);
  return response;
}

export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req: request, secret });

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const accessToken = token.accessToken;
  const guildCheckedAt = token.guildCheckedAt ?? 0;
  const now = Date.now();

  if (accessToken && now - guildCheckedAt > GUILD_CHECK_INTERVAL_MS) {
    const stillMember = await isGuildMember(accessToken);

    if (!stillMember) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "GuildAccessRevoked");
      return clearSessionCookie(NextResponse.redirect(loginUrl));
    }

    const response = NextResponse.next();
    const cookieName = request.cookies.get(SECURE_SESSION_COOKIE_NAME)
      ? SECURE_SESSION_COOKIE_NAME
      : SESSION_COOKIE_NAME;
    const refreshedToken = await encode({ token: { ...token, guildCheckedAt: now }, secret: secret! });
    response.cookies.set(cookieName, refreshedToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieName === SECURE_SESSION_COOKIE_NAME,
      path: "/",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
