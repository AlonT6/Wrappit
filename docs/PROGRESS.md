# Wrappit — Build Progress

Living tracker for the phase-by-phase build. See [`arrgift-wix-headless-plan.md`](arrgift-wix-headless-plan.md) for the full plan.

_Last updated: 2026-07-18_

## Status at a glance

| Phase | State |
|---|---|
| **0 — Setup & Wix connection** | ✅ Done (Netlify deploy optional, not yet done) |
| **1 — Auth (Members)** | ✅ Done — built, tested, **live round-trip confirmed on Netlify** (register → email code → login all work) |
| **2 — Create & manage events** | ✅ Done — built, tested, **live create→CMS round-trip confirmed on Netlify** (event created, appears in CMS + `/dashboard`) |
| **3 — Public invite + RSVP + pledge** | ✅ Done — built, tested (152-test suite), **live RSVP + pledge confirmed on both localhost and production Netlify** (rows in CMS); OG preview still to verify |
| 4 — Organizer dashboard detail | ⬜ Next |
| 5 — Deploy & submit | ⬜ |
| 6 — Showcase extras (optional) | ⬜ |

## Testing

Vitest + jsdom + @testing-library. **152 tests / 26 files.** `npm test` (also `test:watch`, `test:coverage`). Covers the auth surface (client factory, actions/state-machine, member hook, gate, login/signup/forgot flows) and the events surface (slug, validation, `POST /api/events`, `useMyEvents`/`createEvent`/`useEvent`, new-event form, dashboard list). Setup notes: no `@vitejs/plugin-react` (Babel peer conflict — Vitest's oxc handles JSX); `@/*` via native `resolve.tsconfigPaths`.

**Dashboard "doesn't load" — fixed.** `RequireMember` redirected on `!isLoading && !member`, but after login the member query holds a stale cached visitor `null` (isLoading=false) while a refetch is in flight, bouncing a real member to `/login`. Now gates on `isFetching`. Regression test: `components/auth/require-member.dashboard-bug.test.tsx`.

**Login 400 on `/oauth2/authorize` — fixed.** `getBrowserWixClient()` built a **new** Wix client on every call, so `login()`/`register()` seeded a visitor session on one client while `getMemberTokensForDirectLogin()` (the hidden-iframe PKCE exchange) ran on a *different* client — the `sessionToken` didn't match the requesting visitor identity, so Wix rejected the `web_message` authorize call with a 400. Wix's docs explicitly require **one shared client instance** across the app. Fix: `getBrowserWixClient()` now memoizes a **singleton**; `signOut()` calls the new `resetBrowserWixClient()` so logout drops the in-memory member tokens. Regression tests in `wix-client.browser.test.ts`. Note: `getMemberTokensForDirectLogin` is **desktop-only** (needs 3rd-party cookies); mobile needs the full-page-redirect flow.

**Login 400 `Allowed_domains_fetch_failed` — Wix dashboard config (not code).** The `web_message` authorize call validates the app's origin against the OAuth app's allow-list; if it's empty the fetch fails → 400. Fix in **Settings → Development & integrations → Headless Settings → OAuth app `ceba20d8-…` → Settings → URLs**: add both origins (`http://localhost:3000` and the Netlify URL) to **Allowed redirect domains** AND **Allowed authorization redirect URIs** (exact match — scheme/host/port/trailing-slash all count). Retry in fresh incognito.

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

**Wix backend (dashboard):** headless project with Members + CMS. Three CMS collections created and **verified connected** via a (now-deleted) temp `/api/health` route. **Field keys (columns)** — CSV import templates with a sample row live in [`docs/wix-collections/`](wix-collections/) ([Events](wix-collections/Events.csv) · [Rsvps](wix-collections/Rsvps.csv) · [Pledges](wix-collections/Pledges.csv)); code must match these keys exactly on insert:

| Collection ID | Permissions | Field keys |
|---|---|---|
| `events` | **Member-generated content** (Create = Site members; Read/Update/Delete = Site member authors) | `childName`, `gender`, `partyDate`, `partyTime`, `location`, `description`, `inviteSlug`, `status` + nested `paymentLinks` (Array), `giftDisplay` (Object), `charity` (Object) |
| `rsvps` | **Private** (admin-only; guests write via API-key client) | `eventId`, `status` (yes/no attendance), `inviteeName`, `parentName`, `parentName2`, `parentEmail`, `parentPhone`, `dietary` |
| `pledges` | **Private** (admin-only) | `eventId`, `rsvpId`, `contributorName`, `amount` (Number), `method`, `note` |

> ⚠️ Wix **lowercases collection IDs** at creation, so IDs are `events`/`rsvps`/`pledges` (not `Events`…). Always reference via `COLLECTIONS`.
>
> 🔗 **Child collections link by `eventId`, not by `inviteSlug`** — neither `rsvps` nor `pledges` has a slug column. Phase 3 write routes resolve `slug → event → eventId` and store `eventId`. `pledges.rsvpId` is optional (empty for a standalone pledge).

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

> ✅ **Live round-trip confirmed (2026-07-18, on Netlify):** register → email verification code → login all work end-to-end. Phase 1 exit criterion **closed**.

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

> ✅ **Live create→CMS round-trip confirmed (2026-07-18, on Netlify):** logged-in member created an event, row appeared in the Wix CMS + on `/dashboard`. Phase 2 exit criterion **closed**.
>
> 🔧 **Earlier blocker (resolved): `WDE0027` — member lacked insert permission on the `events` collection.** NOT a code bug. **Fix (Wix dashboard, no redeploy):** CMS → Collections → `events` → More Actions → Permissions & Privacy → preset **"Member-generated content"** (Create = Site members; Read/Update/Delete = Site member authors). The `rsvps`/`pledges` collections stay **Private** (admin-only) — guests write via the admin API-key client in Phase 3.
>
> 🧹 **TEMP `detail` field** was added to the 500 response body in [`route.ts`](../app/api/events/route.ts) to surface the cause — **remove before final submit.**

## Phase 3 — what was done

**Invite model (`app/model/invite/`):**
- `invite.types.ts` — `PublicEvent` (guest-safe projection of `WrappitEvent` — no `_id`/`_owner`/`status`), `RsvpInput`, `PledgeInput`, result unions.
- `to-public-event.ts` — the single field whitelist mapping a raw `events` row → `PublicEvent`.
- `invite.validation.ts` — `validateRsvpInput` (required invitee/parent names, attendance boolean-or-'yes'/'no', optional email format) + `validatePledgeInput` (positive finite `amount`, accepts numeric string).
- `get-event.server.ts` — `server-only`; `getPublishedEventBySlug(slug)` via the **admin API-key client**, returns the full row (incl. `_id`) or null for unknown / **draft** events (only `published` is ever exposed).
- `submit-rsvp.ts` / `submit-pledge.ts` — browser POST helpers (mirror `create-event.ts`).

**Server routes (all guest writes/reads via the admin API-key client — collections stay Private, guests never authenticate):**
- `GET /api/invite?slug=` — 404 for unknown/draft, else the `PublicEvent`.
- `POST /api/rsvp` — validate → resolve slug→published event → insert into `rsvps` with `eventId` (never the slug), `status` = 'yes'/'no'. Returns `{ rsvpId }`.
- `POST /api/pledge` — validate → resolve slug→published event → insert into `pledges` with `eventId`, numeric `amount`, optional `rsvpId` link.

**UI:**
- `app/i/[slug]/page.tsx` — **SSR** server component; `generateMetadata()` emits OG/Twitter tags (gift image when present); `notFound()` for unknown/draft. Its own minimal public header/footer (NOT the member-gated `app-chrome`).
- `invite-flow.tsx` (`'use client'`) — 3-step state machine: **invite → RSVP → pledge → done**. Pledge is reachable standalone ("Chip in for the gift" skips RSVP); if a guest RSVPs first, the returned `rsvpId` is linked onto the pledge.
- `not-found.tsx` — friendly public 404.
- `app/events/[id]/page.tsx` — placeholder replaced with a real `InviteLinkCard` (full origin-aware URL, copy button, draft warning).

**Verified:** 152-test suite (was 109), `tsc`, lint, `next build` (routes incl. `/api/{invite,rsvp,pledge}`, SSR `/i/[slug]`) all pass; **no `WIX_API_KEY` in the client bundle** (public client id present).

> ✅ **Live RSVP + pledge confirmed on localhost (2026-07-18) AND production Netlify (2026-07-19):** completed the guest flow on `/i/[slug]` → `rsvps` and `pledges` rows appeared in the Wix CMS. Confirms the admin API-key path end-to-end (no dashboard config needed — collections stay Private). Phase 3 exit **closed**.
>
> 🔧 **Prod SSR 500 root cause (2026-07-19): `WIX_API_KEY` / `WIX_SITE_ID` were not set in Netlify's env**, so `getWixApiClient()` threw during the `/i/[slug]` server render (and would have broken all prod RSVP/pledge writes too). NOT a code bug. See the Netlify env-var gotcha below. Diagnosed by a TEMP try/catch on the page that surfaced the real error (Netlify hides Server Component errors behind a digest).
>
> ⏳ **Still to verify:** the OG/Twitter rich preview (paste the prod invite URL into an OG debugger / chat app).
>
> 🧹 **TEMP diagnostics to remove before final submit:** the try/catch + `generateMetadata` wrapper in `app/i/[slug]/page.tsx`, and the `detail` field in `app/api/events/route.ts`.

## Non-obvious gotchas (for future sessions)

- shadcn `base-nova` uses **Base UI** (`@base-ui/react`), not Radix — `Button` has no `asChild`; use `render={<Link/>}`.
- `@wix/data` `items`: `items.query(collectionId).eq(field, val).find()` → `{ items }`; `items.insert(collectionId, item)` → the created item; `items.get(collectionId, id)` → the item. Member OAuth writes stamp `_owner`; admin API-key reads see all rows (used for global slug-uniqueness).
- Wix auth methods (`register`/`login`/`processVerification`/`sendPasswordResetEmail`/`logout`) live on **`client.auth`** (the OAuthStrategy instance), NOT `@wix/members`. `@wix/members` is profile ops only.
- `wix_refreshToken` cookie is intentionally **not httpOnly** (browser client reads it via js-cookie) — matches Wix's official starter.
- **Netlify env vars for the server-side (admin API-key) client.** `WIX_API_KEY` + `WIX_SITE_ID` must be set in **Netlify → Site configuration → Environment variables**, and their **scopes must include Functions/Runtime** (not just Builds) — SSR pages and API routes run as Netlify Functions. If they're missing/mis-scoped, `getWixApiClient()` throws at runtime: any server-rendered data page 500s and every guest RSVP/pledge write fails, even though the site builds fine and login (which only needs the public `NEXT_PUBLIC_WIX_CLIENT_ID`) still works. **Env-var changes require a fresh redeploy** to take effect. This caused the Phase 3 prod SSR 500 on `/i/[slug]` (2026-07-19).
- Netlify hides Server Component render errors behind a generic digest ("A server error occurred"). To debug, temporarily wrap the server component's data fetch in try/catch and render `err.message`/`err.stack` — or read the function logs for the digest. `next dev` won't reproduce prod-build/runtime issues; `next start` reproduces the build locally but not Netlify's environment (e.g. missing env vars).

## Open / next actions

- [x] **Phase 0 tail done:** deployed to Netlify (`wrappit.netlify.app`); all env vars now set (incl. `WIX_API_KEY`/`WIX_SITE_ID` scoped to Functions).
- [x] **Phase 1 exit closed (2026-07-18):** live register → email code → login confirmed on prod.
- [x] **Phase 2 exit closed (2026-07-18):** live member create → CMS row + `/dashboard` confirmed (after setting `events` perm to "Member-generated content").
- [x] **Phase 3 exit closed (2026-07-19):** RSVP + pledge confirmed on localhost and prod → rows in CMS.
- [ ] **Phase 3 tail:** verify the OG rich preview (paste the prod invite URL into an OG debugger / chat app).
- [ ] **Phase 4 — Organizer dashboard detail:** on `/events/[id]`, show the RSVP list, the **summed pledge total**, copy-invite-link (done), and suggested share text. Exit: organizer sees submitted RSVPs and a correct pledge total.
- [ ] **Before final submit — remove TEMP diagnostics:** the try/catch + `generateMetadata` wrapper in `app/i/[slug]/page.tsx`, and the `detail` field in the 500 handler in `app/api/events/route.ts`.

## How to run locally

```bash
fnm use            # Node from .nvmrc
npm install
# .env.local must contain NEXT_PUBLIC_WIX_CLIENT_ID, WIX_API_KEY, WIX_SITE_ID
npm run dev        # http://localhost:3000
```
