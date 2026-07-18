# Wrappit — Build Progress

Living tracker for the phase-by-phase build. See [`arrgift-wix-headless-plan.md`](arrgift-wix-headless-plan.md) for the full plan.

_Last updated: 2026-07-18_

## Status at a glance

| Phase | State |
|---|---|
| **0 — Setup & Wix connection** | ✅ Done (Netlify deploy optional, not yet done) |
| **1 — Auth (Members)** | ✅ Built, tested (105-test suite), dashboard bug fixed (live member round-trip pending a manual run) |
| **2 — Create & manage events** | ✅ Built & tested (live create→CMS round-trip pending a manual run) |
| 3 — Public invite + RSVP + pledge | ⬜ Next |
| 4 — Organizer dashboard detail | ⬜ |
| 5 — Deploy & submit | ⬜ |
| 6 — Showcase extras (optional) | ⬜ |

## Testing

Vitest + jsdom + @testing-library. **105 tests / 17 files.** `npm test` (also `test:watch`, `test:coverage`). Covers the auth surface (client factory, actions/state-machine, member hook, gate, login/signup/forgot flows) and the events surface (slug, validation, `POST /api/events`, `useMyEvents`/`createEvent`/`useEvent`, new-event form, dashboard list). Setup notes: no `@vitejs/plugin-react` (Babel peer conflict — Vitest's oxc handles JSX); `@/*` via native `resolve.tsconfigPaths`.

**Dashboard "doesn't load" — fixed.** `RequireMember` redirected on `!isLoading && !member`, but after login the member query holds a stale cached visitor `null` (isLoading=false) while a refetch is in flight, bouncing a real member to `/login`. Now gates on `isFetching`. Regression test: `components/auth/require-member.dashboard-bug.test.tsx`.

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

## Phase 2 — what was done

**Events model (`app/model/events/`):**
- `event.types.ts` — `EventInput` / `WrappitEvent` / `PaymentLink` / `GiftDisplay` / `Charity`, `PAYMENT_METHODS`.
- `event.slug.ts` — `slugify` + `generateInviteSlug` (name base + 6-char suffix; rand injectable for tests).
- `event.validation.ts` — `validateEventInput(raw)` normalizes an untrusted payload → clean `EventInput` or a list of friendly errors (required fields, ISO date, http(s) URLs, payment-row cleanup, optional gift/charity objects).
- `use-my-events.ts` / `use-event.ts` — TanStack Query hooks over the **member browser client** (`@wix/data` `items`), scoped to the member's own rows by "Site Member Author" read perms.
- `create-event.ts` — POSTs to `/api/events`, maps the response to `{ ok, event } | { ok:false, errors }`.

**Server (`app/api/events/route.ts`):** `POST` authenticates the member via the cookie OAuth client (`getCurrentMember` → 401 if none), validates the body, generates a **unique** `inviteSlug` (uniqueness checked with the **admin API-key client** since a member only sees their own rows), then **inserts via the member client** so Wix stamps `_owner` = member id. `@wix/data` `items` added to the base OAuth client (`wix-client.base.ts`).

**UI:** `components/app-chrome.tsx` (shared gated header, used by `app/dashboard/layout.tsx` + new `app/events/layout.tsx`); `/events/new` (all fields incl. dynamic payment-link rows, publish toggle, **localStorage draft autosave** cleared on success); `/dashboard` now lists the member's events (empty state + rows linking to detail); `/events/[id]` member-gated **detail shell**. Added `components/ui/textarea.tsx`.

**Verified:** 105-test suite, `tsc`, lint, `next build` (all routes incl. `/api/events`, `/events/[id]`, `/events/new`) pass; **no `WIX_API_KEY` in the client bundle** (public client id present).

> ⏳ **Not yet run:** the live create→CMS round-trip (log in as a member → create an event → see the row in the Wix CMS dashboard → see it on `/dashboard`) needs a real member session — do this manually to close the Phase 2 exit criterion. Assumes the `events` collection permission is **"Site Member Author"** (create/read); if creates 403, set that in the Wix dashboard.

## Non-obvious gotchas (for future sessions)

- shadcn `base-nova` uses **Base UI** (`@base-ui/react`), not Radix — `Button` has no `asChild`; use `render={<Link/>}`.
- `@wix/data` `items`: `items.query(collectionId).eq(field, val).find()` → `{ items }`; `items.insert(collectionId, item)` → the created item; `items.get(collectionId, id)` → the item. Member OAuth writes stamp `_owner`; admin API-key reads see all rows (used for global slug-uniqueness).
- Wix auth methods (`register`/`login`/`processVerification`/`sendPasswordResetEmail`/`logout`) live on **`client.auth`** (the OAuthStrategy instance), NOT `@wix/members`. `@wix/members` is profile ops only.
- `wix_refreshToken` cookie is intentionally **not httpOnly** (browser client reads it via js-cookie) — matches Wix's official starter.

## Open / next actions

- [ ] (Optional Phase 0 tail) Commit + push scaffold → connect Netlify to repo → set the 3 env vars in Netlify → confirm live URL.
- [ ] **Close Phase 1 exit:** manually register a real member, verify the email code, confirm landing on the empty dashboard, and log out (needs a real inbox — can't be done headlessly).
- [ ] **Close Phase 2 exit:** log in as a member, create an event at `/events/new`, confirm the row appears in the **Wix CMS dashboard** and on `/dashboard`. If the create 403s, set the `events` collection permission to **"Site Member Author"**.
- [ ] **Phase 3 — Public invite + RSVP + pledge:** `GET /api/invite`, `POST /api/rsvp`, `POST /api/pledge`; SSR `/i/[slug]` with OG/Twitter meta; 3-step guest flow. Exit: an incognito visitor completes RSVP + pledge → rows written; rich link preview.

## How to run locally

```bash
fnm use            # Node from .nvmrc
npm install
# .env.local must contain NEXT_PUBLIC_WIX_CLIENT_ID, WIX_API_KEY, WIX_SITE_ID
npm run dev        # http://localhost:3000
```
