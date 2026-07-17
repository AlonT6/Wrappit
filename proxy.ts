import { NextResponse, type NextRequest } from 'next/server';
import { createClient, OAuthStrategy } from '@wix/sdk';
import { WIX_REFRESH_TOKEN } from '@/app/model/auth/auth.const';

/**
 * Seed an anonymous Wix visitor session on first visit so both server and
 * browser clients have a refresh token to work with. Member login later
 * overwrites this cookie with member tokens.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (request.cookies.get(WIX_REFRESH_TOKEN)) return response;

  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  if (!clientId) return response; // not configured yet — skip during early setup

  const client = createClient({ auth: OAuthStrategy({ clientId }) });
  const tokens = await client.auth.generateVisitorTokens();

  response.cookies.set(WIX_REFRESH_TOKEN, JSON.stringify(tokens.refreshToken), {
    httpOnly: false, // browser client reads this via js-cookie (see auth.const.ts)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 400, // ~400 days
  });

  return response;
}

export const config = {
  // Run on pages, skip static assets and image files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
