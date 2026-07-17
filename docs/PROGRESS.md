# Wrappit — Build Progress

Living tracker for the phase-by-phase build. See [`arrgift-wix-headless-plan.md`](arrgift-wix-headless-plan.md) for the full plan.

_Last updated: 2026-07-18_

## Status at a glance

| Phase | State |
|---|---|
| **0 — Setup & Wix connection** | ✅ Done (Netlify deploy optional, not yet done) |
| 1 — Auth (Members) | ⬜ Next |
| 2 — Create & manage events | ⬜ |
| 3 — Public invite + RSVP + pledge | ⬜ |
| 4 — Organizer dashboard detail | ⬜ |
| 5 — Deploy & submit | ⬜ |
| 6 — Showcase extras (optional) | ⬜ |

## Key decisions

- **Starter built into THIS repo** (`AlonT6/Wrappit`), not Wix's auto-created repo. User connects Netlify to it manually.
- **Guests never log in.** All invite reads + RSVP/pledge writes go through the **server API-key client** (`ApiKeyStrategy`). Only organizers authenticate (Wix Members).
- **Full client split** (base/server/browser) matching Wix's official starter.
- Node managed via **fnm**, pinned in `.nvmrc` (currently `22.21.1`).

## Phase 0 — what was done

**Stack scaffolded:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Base UI, `base-nova` preset) · TanStack Query · `@wix/sdk` + `@wix/members` + `@wix/data`.

**Wix wiring (`app/model/`):**
- `auth/wix-client.base.ts` — shared OAuth client factory (visitor/member).
- `auth/wix-client.server.ts` — server components / route handlers (`await cookies()`).
- `auth/wix-client.browser.ts` — client components (js-cookie).
- `auth/auth.const.ts` — `WIX_REFRESH_TOKEN` cookie name.
- `wix-api-client.ts` — trusted server API-key client for writes + whitelisted invite reads.
- `collections.ts` — `COLLECTIONS` map of Wix collection IDs.
- `proxy.ts` (repo root) — seeds anonymous visitor session on first visit (Next 16 renamed `middleware`→`proxy`).
- `providers.tsx` — TanStack Query provider, wired into `app/layout.tsx`.

**Wix backend (dashboard):** headless project with Members + CMS. Three CMS collections created and **verified connected** via a (now-deleted) temp `/api/health` route:

| Collection ID | Entity | Notes |
|---|---|---|
| `events` | Events | + nested fields `paymentLinks` (Array), `giftDisplay` (Object), `charity` (Object) |
| `rsvps` | Rsvps | |
| `pledges` | Pledges | `amount` = Number, rest Text |

> ⚠️ Wix **lowercases collection IDs** at creation, so IDs are `events`/`rsvps`/`pledges` (not `Events`…). Always reference via `COLLECTIONS`. CSV import templates kept in `docs/wix-collections/`.

**Env vars** (`.env.local`, git-ignored; template in `.env.template`): `NEXT_PUBLIC_WIX_CLIENT_ID` (public), `WIX_API_KEY` + `WIX_SITE_ID` (server-only secrets). All filled and verified working locally.

**Verified:** typecheck, lint, `next build`, and dev server (200 + real Wix visitor token + real Wix Data round-trip) all pass.

## Non-obvious gotchas (for future sessions)

- shadcn `base-nova` uses **Base UI** (`@base-ui/react`), not Radix — `Button` has no `asChild`; use `render={<Link/>}`.
- Wix auth methods (`register`/`login`/`processVerification`/`sendPasswordResetEmail`/`logout`) live on **`client.auth`** (the OAuthStrategy instance), NOT `@wix/members`. `@wix/members` is profile ops only.
- `wix_refreshToken` cookie is intentionally **not httpOnly** (browser client reads it via js-cookie) — matches Wix's official starter.

## Open / next actions

- [ ] (Optional Phase 0 tail) Commit + push scaffold → connect Netlify to repo → set the 3 env vars in Netlify → confirm live URL.
- [ ] **Phase 1 — Auth:** signup / login / logout, session persistence across reloads, password reset, `EMAIL_VERIFICATION_REQUIRED` handling, member-gated `/dashboard` shell (anonymous → `/login`). Exit: register a member → log in → empty dashboard → log out.

## How to run locally

```bash
fnm use            # Node from .nvmrc
npm install
# .env.local must contain NEXT_PUBLIC_WIX_CLIENT_ID, WIX_API_KEY, WIX_SITE_ID
npm run dev        # http://localhost:3000
```
