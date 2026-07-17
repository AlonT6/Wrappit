# Wrappit — Build Progress

Living tracker for the phase-by-phase build. See [`arrgift-wix-headless-plan.md`](arrgift-wix-headless-plan.md) for the full plan.

_Last updated: 2026-07-18_

## Status at a glance

| Phase | State |
|---|---|
| **0 — Setup & Wix connection** | ✅ Done (Netlify deploy optional, not yet done) |
| **1 — Auth (Members)** | ✅ Built & validated (live member round-trip pending a manual run) |
| 2 — Create & manage events | ⬜ Next |
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

## Phase 1 — what was done

**Auth model (`app/model/auth/`):**
- `auth.actions.ts` — browser-side `signUp` / `signIn` / `verifyEmail` / `sendPasswordReset` / `signOut`. Maps the Wix `StateMachine` (`SUCCESS` / `EMAIL_VERIFICATION_REQUIRED` / `FAILURE` / …) to a small `AuthResult` union with friendly error copy. On SUCCESS it exchanges the session token via `getMemberTokensForDirectLogin` and persists the member refresh token to the shared `wix_refreshToken` cookie (js-cookie) — same cookie the base client reads, so the session survives reloads and is visible to SSR.
- `use-current-member.ts` — TanStack Query hook (`useCurrentMember`) backed by `client.members.getCurrentMember()`; returns `null` for a visitor (the call throws for non-members, caught). `useRefreshCurrentMember()` invalidates it after login/logout.

**UI:** `components/ui/{input,label,card}.tsx` (hand-written, base-nova tokens — npm registry was offline so `shadcn add` couldn't run). `components/auth/{auth-shell,require-member,user-menu}.tsx`.

**Routes:** `/login` (uses `useSearchParams` for `?redirect=`, wrapped in `<Suspense>`), `/signup` (two-step: form → verification-code step when `EMAIL_VERIFICATION_REQUIRED`), `/forgot-password`, and a member-gated `/dashboard` (layout wraps children in `RequireMember` + header with `UserMenu`).

**Gating:** `RequireMember` (client) reads `useCurrentMember`; while loading shows a spinner, anonymous → `router.replace('/login?redirect=…')`.

**Verified:** typecheck, lint, `next build` (all 6 routes) pass. Dev server: all routes 200; visitor token seeded by proxy; **no `WIX_API_KEY` in the client bundle or served HTML** (public client id present, as expected); dashboard SSR renders the gate (not member content) for a visitor; **browser-confirmed** anonymous `/dashboard` → redirects to `/login?redirect=%2Fdashboard`.

> ⏳ **Not yet run:** the full live member round-trip (register → receive email code → verify → land on dashboard → log out) needs a real inbox for the verification code — do this manually to close the Phase 1 exit criterion. Depending on the Wix project's signup policy, `register` may return `SUCCESS` directly (no verification) or `EMAIL_VERIFICATION_REQUIRED`; both paths are handled.

## Non-obvious gotchas (for future sessions)

- shadcn `base-nova` uses **Base UI** (`@base-ui/react`), not Radix — `Button` has no `asChild`; use `render={<Link/>}`.
- Wix auth methods (`register`/`login`/`processVerification`/`sendPasswordResetEmail`/`logout`) live on **`client.auth`** (the OAuthStrategy instance), NOT `@wix/members`. `@wix/members` is profile ops only.
- `wix_refreshToken` cookie is intentionally **not httpOnly** (browser client reads it via js-cookie) — matches Wix's official starter.

## Open / next actions

- [ ] (Optional Phase 0 tail) Commit + push scaffold → connect Netlify to repo → set the 3 env vars in Netlify → confirm live URL.
- [ ] **Close Phase 1 exit:** manually register a real member, verify the email code, confirm landing on the empty dashboard, and log out (needs a real inbox — can't be done headlessly).
- [ ] **Phase 2 — Create & manage events:** `POST /api/events` (member-scoped, slug uniqueness) → `/events/new` form (all fields incl. payment links, localStorage autosave) → `/dashboard` lists the member's events → `/events/[id]` detail shell. Exit: creating an event writes a row visible in the Wix CMS dashboard and it appears on `/dashboard`.

## How to run locally

```bash
fnm use            # Node from .nvmrc
npm install
# .env.local must contain NEXT_PUBLIC_WIX_CLIENT_ID, WIX_API_KEY, WIX_SITE_ID
npm run dev        # http://localhost:3000
```
