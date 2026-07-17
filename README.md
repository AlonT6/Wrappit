# Wrappit — Group Birthday Gifting (Wix Headless)

Organizer creates a birthday event → shares an invite link → guests RSVP and pledge money
toward a single group gift → organizer tracks RSVPs and pledges on a dashboard. Money is handled
via **payment links only** (Venmo/Zelle/PayPal/CashApp); the app records self-reported pledges and
never processes or holds funds.

Built on **Wix Headless** (Members + CMS/Wix Data) with **Next.js (App Router)** on **Netlify**.
See [`docs/arrgift-wix-headless-plan.md`](docs/arrgift-wix-headless-plan.md) for the full plan.

## Stack

- Next.js 16 (App Router, RSC) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui (Base UI, `base-nova`) · TanStack Query
- `@wix/sdk` (`OAuthStrategy` client, `ApiKeyStrategy` server) · `@wix/members` · `@wix/data`

## Local setup

```bash
fnm use            # Node 22 (see .nvmrc)
npm install
cp .env.template .env.local   # then fill in the three values below
npm run dev
```

## Environment variables

| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_WIX_CLIENT_ID` | Wix dashboard → Settings → Headless → OAuth apps | Public; ships to browser. |
| `WIX_API_KEY` | https://manage.wix.com/account/api-keys | **Server-only secret.** Wix Data + Members perms. |
| `WIX_SITE_ID` | `{SITE_ID}` in `wix.com/dashboard/{SITE_ID}/` | Server-only. |

Server secrets live in `.env.local` locally and in **Netlify env** in production — never `NEXT_PUBLIC_`,
never committed, never logged.

## Wix client architecture

- `app/model/auth/wix-client.base.ts` — shared OAuth client factory (visitor/member).
- `app/model/auth/wix-client.server.ts` — server components / route handlers (`await cookies()`).
- `app/model/auth/wix-client.browser.ts` — client components (js-cookie).
- `app/model/wix-api-client.ts` — trusted **server API-key** client for writes and whitelisted
  public invite reads (so collections are never opened to "Anyone" and guests never log in).
- `proxy.ts` — Next.js proxy (formerly middleware); seeds an anonymous visitor session
  (`wix_refreshToken` cookie) on first visit.

## Deploy

Push to `main` → Netlify auto-builds & redeploys.
