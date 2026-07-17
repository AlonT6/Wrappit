# Arrgift / wrappit — Group Birthday Gifting on Wix Headless (Lean MVP)

> Standalone build plan. Self-contained — no dependency on any prior repo. Start from an official
> **Wix Next.js headless starter**; the Wix "Deploy to Netlify" flow **creates the GitHub repo for
> you** — set it to **public** afterward (required for the Headless Day prize).

## Context

**Arrgift (aka "wrappit")** is a group birthday-gifting web app. An organizer creates a birthday
event, shares an invite link, guests RSVP and **pledge money toward a group gift**, and the
organizer tracks RSVPs and pledges on a dashboard. Money is handled via **payment links only**
(Venmo/Zelle/PayPal/CashApp) — the app records self-reported pledges and never processes or holds
funds. This avoids PCI/KYC/AML entirely and matches Wix Headless's hard limit (no pooled-fund /
split-payment / payout primitive). If real pooled funds are ever needed later, the path is Stripe
Connect — not Wix.

**Why this stack:** the app is being built to enter Wix's internal **Headless Day** competition —
build a real Wix Headless site, win a MacBook Neo. It showcases the decoupled headless story: a
**Next.js app hosted on Netlify**, connected to **Wix business solutions** via the Wix SDK, using
Wix's officially blessed Next.js + Netlify integration.

**Scope:** Lean MVP validating the core loop — member signup → create event → share invite → guest
RSVP + pledge → organizer dashboard. Everything else is deferred (see Phase 6).

---

## Headless Day — contest requirements

Verified from the event site (`manage.wix.com/headless-builder-funnel/headless-day`).

**Submission form:** `Site Name*`, `Site ID*`, `Site URL*` (a free `https://your-site.com` — the
Netlify URL qualifies), `GitHub Repo` (optional on the form but **required for the big prize** — a
public repo with all project files), and **Business Solutions** tags used.

**Eligibility:** (1) a Wix headless **project** (provides the **Site ID**) with business solutions
connected; (2) a **live Site URL**; (3) a **public GitHub repo**; (4) tag the solutions used.

**Design consequence:** judging rewards **real, working use of Wix business solutions** — data must
truly round-trip to Wix, never be hardcoded. The MVP connects the **core** solutions (**Members** +
**CMS/Wix Data**); breadth (Blog, Forms, Events, …) is added later in Phase 6 for more tags without
bloating the MVP. Slack support: **#headless-day-26**.

---

## Stack

- **Framework:** **Next.js (App Router)** — React Server Components, Tailwind CSS + shadcn/ui,
  TanStack Query for client data. Started from an **official Wix Next.js headless starter template**.
- **Host:** **Netlify**, via Wix's in-dashboard **"Deploy to Netlify"** flow, which **auto-configures
  the headless OAuth client ID** as an env var. Netlify's Next.js Runtime provides SSR/ISR +
  serverless functions automatically.
- **Wix connection:** `@wix/sdk`. Two clients:
  - **Client-side** `OAuthStrategy({ clientId })` (public client id) for visitor/member sessions and
    `@wix/members` auth.
  - **Server-side** API-key client (Wix API key + Site ID, server-only secrets) used in **Route
    Handlers / Server Actions** for trusted, tamper-proof writes.
  - Modules: **`@wix/members`** (custom email+password auth), **`@wix/data`** (CMS collections).
- **SSR requirement:** the public invite page is **server-rendered with Open Graph / Twitter meta
  tags** so shared invite links show a rich preview (title, child's name, image) in
  WhatsApp/iMessage/social. This is the main reason for Next.js over a SPA.
- **Node:** ≥ v20.11.

### Environment variables
- Client: `NEXT_PUBLIC_WIX_CLIENT_ID` (public OAuth client id — auto-configured by the Deploy-to-
  Netlify flow).
- Server (Netlify env, secret): `WIX_API_KEY`, `WIX_SITE_ID`.

---

## Data model — Wix CMS (Wix Data collections)

Document-style. Create in the Wix dashboard.

- **`Events`** — `_owner` (member id), `childName`, `gender?`, `partyDate`, `partyTime?`, `location`,
  `description?`, `inviteSlug` (unique), `paymentLinks` (array of `{type, label, url}`),
  `giftDisplay?` (`{title, description, imageUrl, link}`), `charity?` (`{name, url, why}`),
  `status` (draft|published), `createdAt`. Permissions: **Site Member Author** for create/update;
  the public invite read is served server-side (whitelisted fields only), not by opening the
  collection to "Anyone".
- **`Rsvps`** — `eventId`, `status` (yes|no|maybe), `inviteeName`, `parentName`, `parentName2?`,
  `parentEmail`, `parentPhone`, `dietary?`, `createdAt`. Written server-side.
- **`Pledges`** — `eventId`, `rsvpId?`, `contributorName`, `amount`, `method`, `note?`, `createdAt`.
  Self-reported; written server-side. Summed per event on the dashboard.

---

## Server endpoints (Next.js Route Handlers, `app/api/*`)

Use the server API-key client so visitors can't tamper with arbitrary rows.

- `GET  /api/invite?slug=` → public event data, **whitelisted fields only** (no owner PII). (Also
  consumed by the invite page's server component for SSR + OG tags.)
- `POST /api/rsvp` → validate + write an `Rsvps` row.
- `POST /api/pledge` → write a `Pledges` row.
- `POST /api/events` → member-scoped create/update of the caller's own event; enforce slug
  uniqueness + ownership.

---

## Routes (Next.js App Router)

Auth via `@wix/members` (client OAuth); handle `EMAIL_VERIFICATION_REQUIRED` and password reset.

| Route | Rendering | What |
|---|---|---|
| `/` | static/SSG | Landing/hero (marketing). |
| `/signup`, `/login` | client | Wix Members custom email+password. |
| `/dashboard` | client, member-gated | List my events + Create button. |
| `/events/new` | client | Create-birthday form; **autosave draft** to localStorage. |
| `/events/[id]` | client, member-gated | Organizer detail: RSVP list, pledge total, copy-invite-link, share text. |
| `/i/[slug]` | **SSR + OG meta** | Public invite + 3-step guest flow: (1) details + RSVP, (2) pledge amount + message, (3) payment links + soft signup prompt. |

---

## Constraints & gotchas

1. **Persistence must be real.** Every entity round-trips to a Wix Data collection — verify in the
   Wix CMS dashboard, never accept hardcoded local data. This is both correctness and the contest's
   entire point.
2. **Identity scoping.** SDK queries return different data for a visitor vs a member, and for the
   client vs the server (API-key) client. Test the invite flow as a true visitor (incognito) and
   organizer flows as a logged-in member.
3. **Secrets stay server-side.** `WIX_API_KEY` lives only in Netlify server env — never
   `NEXT_PUBLIC_`, never logged, never in the client bundle. Only the public client id ships to the
   browser.
4. **App-install permissions** can 403 on some accounts. If a solution won't install, choose another
   for the tag; core Members + CMS must work.
5. **Trim the starter.** Wix Next.js templates ship demo pages/deps — delete what we don't use so
   the repo reads clean for judging.

---

## Development phases

Each phase has an **exit criterion** — do not start the next until it's met.

### Phase 0 — Setup & Wix connection
- **Create a Wix headless project** at `wix.com/intro/headless`. During creation, pick the business
  features **Members** + **CMS** (the "choose business features" step; more can be added later).
- **Deploy the starter via the paved flow:** on the Wix templates page (`wix.com/developers/
  headless/templates`), pick a Next.js template → **Deploy** → **Netlify** → **Connect** your
  project → **Agree & Add** → **Connect to GitHub** → **Save & Deploy**. This **auto-creates a GitHub
  repo**, connects Netlify↔GitHub CD, and **auto-configures the public client id** env var. Set the
  repo to **public**. Then strip demo content; ensure Tailwind + shadcn/ui.
- **Identifiers:** Site ID = the `{SITE_ID}` in the project dashboard URL
  (`wix.com/dashboard/{SITE_ID}/`); create the **API key** at `wix.com/account/api-keys` (server-only).
  Add server secrets `WIX_API_KEY`, `WIX_SITE_ID` in Netlify env.
- **Collections:** create `Events`, `Rsvps`, `Pledges` in the project dashboard **CMS**.
- Wire the two `@wix/sdk` clients (client OAuth + server API-key).
- **Deploy model:** push to `main` → Netlify auto-builds & redeploys. Local dev: `npm install` &&
  `npm run dev`. (Optional manual deploy: Netlify CLI `netlify deploy [--prod]`.)
- **Exit:** app runs locally and is live on Netlify; a visitor token works; the three collections
  exist (empty).

### Phase 1 — Auth (Members)
- Signup, login, logout; session persistence across reloads; password reset; email-verification
  handling.
- Member-gated `/dashboard` shell (anonymous → `/login`).
- **Exit:** register a member, log in, land on an empty dashboard, log out.

### Phase 2 — Create & manage events
- `Events` collection + `POST /api/events` (member-scoped, slug uniqueness).
- `/events/new` form with all fields incl. payment links; localStorage autosave draft.
- `/dashboard` lists the member's events; `/events/[id]` detail shell.
- **Exit:** creating an event writes a row visible in the **Wix CMS dashboard** and it appears on
  `/dashboard`.

### Phase 3 — Public invite + RSVP + pledge
- `Rsvps` + `Pledges` collections; `GET /api/invite`, `POST /api/rsvp`, `POST /api/pledge`.
- `/i/[slug]` **server-rendered** with OG/Twitter meta; 3-step guest flow; payment-links in step 3.
- **Exit:** an **incognito visitor** completes RSVP + pledge → `Rsvps`/`Pledges` rows written; links
  render; sharing the link shows a rich preview (verify OG tags).

### Phase 4 — Organizer dashboard detail
- `/events/[id]`: RSVP list, **summed pledge total**, copy-invite-link button, suggested share text.
- **Exit:** organizer sees submitted RSVPs and a correct pledge total.

### Phase 5 — Deploy & submit
- Production deploy on Netlify; verify all `app/api/*` endpoints + SSR in prod; confirm the browser
  bundle contains **no secrets** (only the public client id).
- Push to a **public GitHub repo** with all project files.
- Submit: Site Name, **Site ID**, **Site URL** (Netlify), GitHub repo, Business Solutions tags
  (**Members**, **CMS**).
- **Exit:** submission accepted; live URL works end-to-end for a fresh visitor.

### Phase 6 — Showcase extras (optional, post-MVP)
Add real Wix business solutions to earn more contest tags and flesh out the product, one at a time:
- **Blog** via `@wix/blog`; **Contact** via Wix **Forms** / `@wix/crm`; **Wix Events** for richer
  event/RSVP handling; **media upload** via `@wix/media` (thank-you notes); AI invitation generation
  (Wix AI image module or BYO OpenAI); kids'-birthday reminders + triggered emails/automations;
  edit-birthday, profile editing, legal pages.

---

## Verification (end-to-end)

- **Local:** register a member → log in → create an event with payment links → confirm the row in
  the **Wix CMS dashboard** → open `/i/[slug]` in **incognito** → complete RSVP + pledge → confirm
  `Rsvps`/`Pledges` rows and that links render → back on the dashboard, RSVP appears and pledge total
  sums correctly.
- **Link preview:** paste the invite URL into a link-preview/OG debugger (or a chat app) and confirm
  title/image render from SSR.
- **Production:** repeat the visitor invite flow on the live Netlify URL; confirm `app/api/*` +
  SSR work in prod and the bundle exposes no secrets.
- **Contest:** public repo has all files; submission form accepts Site Name / Site ID / Site URL;
  Members + CMS tagged.
