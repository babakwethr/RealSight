# RealSight — Production Handoff

Single-file orientation for any new contributor (human or agent) joining the
RealSight codebase. Read this first, then `CLAUDE.md`, then `src/App.tsx`.

Last updated: 15 May 2026.

---

## 1. What RealSight is

**RealSight is a Dubai real-estate intelligence platform.** It pulls live data
from the Dubai Land Department (DLD), layers AI-generated verdicts on top, and
gives investors and brokers a way to score deals, track holdings, and explore
the market without spending hours on spreadsheets.

It serves **two primary personas**:

- **Investors** — browse projects, score deals, track a portfolio, talk to an
  AI concierge, get monthly curated picks.
- **Advisers / brokers** — analyse deals for clients, publish branded
  presentations and monthly picks, run a multi-tenant workspace with their own
  investor list.

The product is **mobile-first**, ships as a web app on Vercel and as native
iOS/Android via Capacitor, supports six languages (English, Arabic, Spanish,
French, Farsi, Russian) with RTL where needed, and is deployed entirely on a
serverless stack (Supabase + Vercel + a small AWS Lambda relay).

---

## 2. Personas & access tiers

| Persona | What they see | Where their UX lives |
|---|---|---|
| **Public visitor** | Marketing landing, adviser white-label pages (`/a/:slug`), legal pages, share-link PDFs. No login required. | `src/pages/public/`, `src/pages/MarketHome.tsx` (in public mode) |
| **Investor (free)** | Limited dashboard, basic market intelligence, watchlist. Upsell banners for Pro features. | `src/pages/` (most files) |
| **Investor (Pro)** | Full Deal Analyzer, Compare, Opportunity Signals, unlimited Concierge. | Same pages — gated via `<FeatureGate>` and `<UpsellBanner>` |
| **Adviser (Pro)** | Investor surfaces + Studio (presentations, social pack, video, buyer matcher) + a workspace of their own investors. | `src/pages/Studio*.tsx`, `src/pages/admin/*` |
| **Admin** | Everything an adviser sees, plus `AdminWorkspace`, user provisioning, DLD analytics, monthly-pick curation, inventory management. | `src/pages/admin/*` (gated by `<AdminRoute>`) |

**Role source of truth:** `user_roles.role` in Supabase (`admin` or `user`),
combined with `user.user_metadata.signup_role` (`investor` or `advisor`) for
onboarding routing. Admins always fall into the adviser UX.

---

## 3. Tech stack at a glance

| Layer | Choice |
|---|---|
| Framework | React 18.3 + Vite 5 + TypeScript 5 |
| Styling | Tailwind CSS 3.4 + HSL CSS variables (`src/index.css`) |
| UI primitives | shadcn/ui (Radix under the hood) in `src/components/ui/` |
| Routing | React Router 6 (config in `src/App.tsx`) |
| Animation | Framer Motion |
| Charts | Recharts (line / area / pie) |
| Maps | Leaflet via `react-leaflet`, OSM/CartoDB tiles |
| PDF | `@react-pdf/renderer` |
| Server state | TanStack Query 5 |
| Backend | Supabase — auth, Postgres (+ RLS), Edge Functions (Deno) |
| Geo relay | AWS Lambda in `me-central-1` (DDA UAE-only API) |
| Email | Resend |
| AI | Google Gemini (`gemini-2.5-flash` default) |
| Billing | Stripe (subscriptions, trials, promo codes) |
| Mobile | Capacitor 8 (iOS + Android) |
| i18n | i18next + react-i18next, 6 languages, RTL aware |
| Deploy | Vercel — **git push to `main` only** (no `vercel deploy` from CLI) |
| Tests | Vitest + Testing Library |

---

## 4. Repo map

```
src/
├── pages/                  Route components — one per route
│   ├── admin/              Admin-only pages
│   ├── public/             Unauthenticated marketing pages
│   └── preview/v3/         Experimental V3 mobile prototype (DO NOT delete)
├── components/
│   ├── ui/                 shadcn/ui primitives (Radix) — don't edit casually
│   ├── layout/             AppLayout, AppSidebar, MobileNav, MobileDrawer, AIBar
│   ├── charts/             Recharts wrappers
│   ├── pdf/                @react-pdf/renderer templates
│   ├── admin/              Admin-only widgets
│   ├── portfolio/          Portfolio-specific widgets
│   ├── HeroMetricCard.tsx  Cross-cutting gradient hero card
│   ├── AIVerdict.tsx       Cross-cutting "RealSight AI · Verdict" panel
│   ├── PhoneFrame.tsx      Reusable iPhone-shaped mockup frame
│   ├── ProtectedRoute.tsx  Auth gate (login + email verified + onboarded)
│   ├── AdminRoute.tsx      Admin-only gate
│   ├── FeatureGate.tsx     Plan-tier / feature-flag gate
│   └── UpsellBanner.tsx    Plan upgrade banner
├── hooks/                  useAuth, useUserRole, useTenant, useInvestorData…
├── lib/                    cn(), supabase client, capacitor bridge, helpers
├── integrations/supabase/  Generated DB types + client
├── i18n/                   i18next config + locale JSONs
└── index.css               Design tokens (HSL CSS vars), aurora gradients

supabase/
└── functions/              18 Deno edge functions (see §6)

aws-relay/
├── index.mjs               UAE Lambda — DDA geo-bypass proxy
└── deploy.sh               Idempotent deploy script (me-central-1)

DDA API Docs/               PDFs from Dubai Digital Authority
docs/                       Internal product/launch docs
android/  ios/              Capacitor native shells
```

Top-level docs worth knowing: `CLAUDE.md` (conventions), `DESIGN.md`,
`PRODUCT_PLAN.md`, `REALSIGHT_MASTER_SPEC.md`,
`RealSight-Color-Palette.html` (interactive swatch reference).

---

## 5. Route inventory

### Public (~12)

| Path | Component | File | Purpose |
|---|---|---|---|
| `/` | `MarketHome` | `src/pages/MarketHome.tsx` | Public home — market overview |
| `/about` | `PublicHome` | `src/pages/public/PublicHome.tsx` | About / landing |
| `/for-advisers` (alias `/for-advisors`) | `ForAdvisers` | `src/pages/public/ForAdvisers.tsx` | Adviser marketing |
| `/a/:slug` | `AdviserLanding` | `src/pages/public/AdviserLanding.tsx` | White-label adviser landing |
| `/r/:id` | `ShareLinkRedirect` | `src/pages/ShareLinkRedirect.tsx` | Share-link → PDF redirect |
| `/request-access` | `RequestAccess` | `src/pages/RequestAccess.tsx` | Waitlist form |
| `/terms` / `/privacy` / `/security` | legal pages | `src/pages/public/` | Compliance |
| `/login`, `/login-page`, `/reset-password`, `/auth/callback` | auth flows | `src/pages/` | Login + Supabase OAuth callback |

### Investor (authenticated, ~22)

| Path | Component | Purpose |
|---|---|---|
| `/dashboard` | `MarketHome` | Auth home — market overview |
| `/portfolio` | `Portfolio` | Holdings, allocations, performance |
| `/picks` | `MonthlyPicks` | Curated monthly deal picks |
| `/top-picks` | `TopPicks` | Ranked top opportunities |
| `/projects`, `/projects/:id` | `Projects`, `ProjectDetail` | Browse + project detail |
| `/payments` | `Payments` | Invoice history |
| `/billing` | `Billing` | Subscription + plan |
| `/documents` | `Documents` | Document library |
| `/compare` | `Compare` | Side-by-side project comparison |
| `/updates` | `Updates` | Project news feed |
| `/concierge` | `Concierge` | AI advisor chat |
| `/market-intelligence` | `MarketIntelligence` | Dubai market trends |
| `/market-pulse` | `MarketPulse` | Real-time sentiment |
| `/market-index` | `MarketIndex` | Index performance |
| `/heatmap` | `DubaiHeatmap` | Geographic price/activity heatmap |
| `/radar` | `GlobalRadar` | Global market radar (map) |
| `/opportunity-signals` | `OpportunitySignals` | AI-generated deal signals |
| `/deal-analyzer` | `DealAnalyzer` | Scoring + scenario modelling |
| `/watchlist` | `Watchlist` | Saved projects |
| `/account` | `Account` | Profile + settings |
| `/onboarding` | `Onboarding` | First-time investor setup |

### Admin (authenticated + `isAdmin`, ~13)

| Path | Component | Purpose |
|---|---|---|
| `/studio` | `Studio` | Adviser tools workspace |
| `/studio/presentation` | `PresentationGenerator` | Generate investor presentations |
| `/admin` | `AdminWorkspace` | Admin overview |
| `/admin/setup` | `SetupWizard` | First-time adviser tenant setup |
| `/admin/investors`, `/admin/investors/:investorId` | `AdminInvestors`, `AdminInvestorDashboard` | Investor list + drill-in |
| `/admin/users` | `AdminUsers` | User provisioning |
| `/admin/monthly-picks` | `AdminMonthlyPicks` | Curate + publish picks |
| `/admin/settings` | `AdminSettings` | Platform config |
| `/admin/dld-analytics` | `AdminDLDAnalytics` | DLD analytics |
| `/admin/market-pulse`, `/admin/market-index` | reused investor pages | Admin views |
| `/admin/inventory` | `AdminInventory` | Inventory catalogue |
| `/admin/projects` | `AdminProjects` | Project CRUD + publishing |

### Preview V3 (~6, unauth, isolated)

`/preview/v3`, `/preview/v3/home`, `/preview/v3/deal-analyzer`,
`/preview/v3/portfolio`, `/preview/v3/radar`, `/preview/v3/profile` —
mobile-first design exploration in `src/pages/preview/v3/`. **Do not delete;
do not ship.** No auth, no session leakage.

`*` → `NotFound`.

---

## 6. Backend & data layer

### Supabase project

- **Project ref:** `hcbpveurcfdvfjskovvf` (production).
- **URL:** `https://hcbpveurcfdvfjskovvf.supabase.co`
- **Anon (publishable) key:** lives in `.env.local` as `VITE_SUPABASE_ANON_KEY`
  and in the Vercel env. Reference by env-var name, never paste the value.
- **Client:** `src/integrations/supabase/client.ts` (singleton).
- **Generated types:** `src/integrations/supabase/types.ts` — regenerate with
  the Supabase MCP `generate_typescript_types` tool.

### Edge functions (`supabase/functions/`)

| Function | Purpose |
|---|---|
| `dld-proxy` ⭐ | OAuth2 client-credentials → DDA gateway. Routes via UAE Lambda relay. Token-cached 60min. Entity allow-list (`dld`, `det`, `rta`, `dsc`). 503 fallback on failure. |
| `chat-concierge` | Authenticated investor chat → Gemini with UAE-RE system prompt |
| `chat-public` | Public chat (no auth); reads tenant branding |
| `gemini-proxy` | Generic pass-through to Gemini `generateContent` |
| `create-checkout-session` | Stripe checkout — plan, trial, referral metadata |
| `stripe-webhook` | Updates subscription status + referral credits |
| `activate-investor` | Onboarding email + magic link via Resend |
| `create-investor`, `create-user`, `delete-user` | Auth admin endpoints |
| `resend-invitation` | Re-send invite via Resend |
| `send-password-reset` | Password reset email |
| `send-deal-report` | Email base64 PDF deal analysis to client |
| `extract-listing` | Scrape Bayut / PF / Dubizzle → normalised property record |
| `proxy-image` | CORS-friendly image proxy for listing photos |
| `r` | Short-link redirector for PDF share links |
| `reelly-proxy` | Off-plan inventory API (1,954 Dubai projects). Uses `REELLY_API_KEY` + `X-API-Key` header. Live since 17 May 2026. |
| `seed-demo-user` | Seed QA/test data |

### Database tables (the app reads/writes these)

```
access_requests        documents             projects
area_price_index_monthly  dubai_price_index_monthly  rera-qr-codes
chat_messages          holdings              share_links
chat_threads           investors             tenant_inventory
custom_projects        monthly_pick_items    tenants
dld_areas              monthly_picks         updates
dld_developers         payments              user_roles
dld_transactions       profiles              project-media
```

For column-level shapes, read `src/integrations/supabase/types.ts`.

### AWS UAE relay

DDA's API only accepts UAE source IPs. Supabase Edge runs from Tokyo, Vercel
from the US — both blocked. So we run a tiny Lambda in `me-central-1` as a
dumb pass-through.

| Item | Value |
|---|---|
| Endpoint | `https://5is6rhcpjf.execute-api.me-central-1.amazonaws.com` |
| Lambda name | `dda-uae-relay` |
| AWS account | `253775151805` |
| Region | `me-central-1` |
| Auth header | `x-relay-secret` (value in Lambda env `RELAY_SHARED_SECRET`) |
| Wire request | `POST { url, method, headers, body }` |
| Wire response | `{ status, headers, body }` |
| Host allow-list | `*.data.dubai` only |
| Timeout | 30s |
| Health check | `GET /` → `{ status, service, region, ts }` |

**Status:** live in production as of 14 May 2026. Real DLD transactions
flow end-to-end through `dld-proxy` (verified with Marsa Dubai + Burj
Khalifa transactions).

Lambda env vars needed by `dld-proxy`:

- `DDA_UAE_RELAY_URL` = the endpoint above
- `DDA_UAE_RELAY_SECRET` = matches Lambda's `RELAY_SHARED_SECRET`
- `DDA_CLIENT_ID`, `DDA_CLIENT_SECRET`, `DDA_APP_IDENTIFIER`, `DDA_BASE_URL`,
  `DDA_ENABLED=true`

### External services

| Service | Used for | Where |
|---|---|---|
| Stripe | Subscriptions, checkout, webhook | `create-checkout-session`, `stripe-webhook` |
| Resend | Transactional email | activate-investor, deal report, password reset |
| Google Gemini | AI chat + AI verdicts | `chat-concierge`, `chat-public`, `gemini-proxy` |
| DDA (Dubai Digital Authority) | Live real-estate transactions, developers, areas | `dld-proxy` via UAE relay |
| Bayut / Property Finder / Dubizzle | Listing scraping for Deal Analyzer | `extract-listing` |
| Reelly | Off-plan inventory | `reelly-proxy` (live, `X-API-Key` auth) |
| Leaflet / OSM | Map tiles | `DubaiHeatmap`, `GlobalRadar` |

---

## 7. Auth & role logic

- **`useAuth`** (`src/hooks/useAuth.tsx`) — watches
  `supabase.auth.onAuthStateChange`. Single source of truth for `user`,
  `session`, `loading`.
- **`useUserRole`** (`src/hooks/useUserRole.tsx`) — reads `user_roles.role`
  (`admin` | `user`). Retries up to 4× while the user-creation trigger
  catches up. Also computes `needsOnboarding`.
- **`<ProtectedRoute>`** — requires `user` + `email_confirmed_at` + completed
  onboarding. Pass `requireOnboarding={false}` on the auth pages themselves
  to avoid loops.
- **`<AdminRoute>`** — additional `isAdmin` check on top of ProtectedRoute.
- **Onboarding gates differ by persona:**
  - Adviser: `profile.tenant_id` must be set (not null, not zero-uuid).
  - Investor: `profile.full_name` + `investor.phone` must be set.
- **iOS deep-link OAuth:** `CapacitorDeepLinkHandler` in `src/App.tsx`
  listens to `appUrlOpen` and exchanges PKCE codes. Custom scheme:
  `app.realsight.invest://auth/callback`.

---

## 8. Design system

Vibe: **dark cinematic, mint-accented, glass surfaces, aurora glows.**

| Element | Detail |
|---|---|
| Accent colour | Mint `#18D6A4` (`--accent-green-dark` in `index.css`) |
| Glass formula | `backdrop-filter: blur(30px) saturate(1.6)` over `rgba(15,20,40,0.55)` |
| Hero cards | `src/components/HeroMetricCard.tsx` — 8 variants: `blue` · `mint` · `purple` · `amber` · `rose` · `cyan` · `sunset` · `night`. Convention: each page picks a different variant. |
| AI verdict | `src/components/AIVerdict.tsx` — 4 tones: `positive` (emerald) · `caution` (amber) · `negative` (red) · `neutral` (violet). Always paired with a hero. |
| Phone mockup | `src/components/PhoneFrame.tsx` — iPhone-14-Pro-shaped frame for screenshots. Supports tilt; aspect ratio 9 : 19.5. |
| Mobile nav | `src/components/layout/MobileNav.tsx` — Apple-style glass bottom bar, 72px tall, 26px radius, `mx-2 mb-3`, with a protruding 52px mint FAB in a 40px-radius notch. Role-aware FAB: Adviser → `/deal-analyzer`, Investor → `/concierge`. |
| Tokens | HSL CSS variables in `src/index.css` |
| Palette reference | `RealSight-Color-Palette.html` at repo root — open in a browser, click to copy swatches |

**Per-page hero convention** (so no two pages feel the same):

- MarketHome → `blue`
- Portfolio → `purple`
- MarketIntelligence → `mint` (Dubai-wide) / `cyan` (area selected)
- Default decoration: `"rings"` (not `"spark"` — no star bursts behind text)

---

## 9. Build, deploy & ops

### Scripts

```bash
npm run dev              # Vite dev server (localhost:8080)
npm run build            # Production build
npm run build:dev        # Dev-mode build
npm run lint             # ESLint
npm run test             # Vitest single-run
npm run test:watch       # Vitest watch
npm run preview          # Local preview of prod build
npm run mobile:ios       # Build + open Xcode
npm run mobile:android   # Build + open Android Studio
```

### Deploy

1. `git add . && git commit -m "<message>" && git push origin main`
2. Poll `GET https://api.vercel.com/v6/deployments?projectId=<id>&limit=1`
   until `state=READY` (typically <2 min).
3. `curl -I` a user-facing domain to confirm HTTP 200 before declaring
   "shipped".

**Never** use `vercel deploy` from CLI. **Never** create a new Vercel
project without asking the user first.

### Secrets

| Location | Contains |
|---|---|
| Supabase Edge Function secrets (dashboard or Management API) | `DDA_*`, `DDA_UAE_RELAY_*`, `STRIPE_*`, `RESEND_API_KEY`, `GEMINI_API_KEY`, `REELLY_API_KEY` (pending) |
| AWS Lambda env (`dda-uae-relay`) | `RELAY_SHARED_SECRET` |
| User-level `~/.claude/.env` (mode 600) | `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `KIE_KEY` |
| Vercel project env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

Always reference by variable name. Never echo, log, print, or commit values.

### Known gaps

- **Map tiles:** no Mapbox / paid tile provider pinned. Defaults to OSM
  via CartoDB dark basemap.
- **Native mobile:** Capacitor configured and deep-links wired, but native
  builds not yet smoke-tested in production.

---

## 10. Golden rules

1. **Do not change data flow, logic, routes, or menus unless explicitly
   asked.** Work in progress is almost always visual / UX. If a task sounds
   like it touches a route, hook, Supabase query, or removes a menu item —
   pause and confirm first.
2. **Babak is non-technical.** Replies must be short, plain-language,
   action-oriented. Use bullets, not paragraphs. Send a working link to test,
   not a summary. Avoid jargon.
3. **Don't echo secrets.** Reference env vars by name. Never paste values
   into chat, logs, or files.
4. **Magic MCP / 21st.dev:** only when Babak explicitly asks ("use Magic
   MCP", "use 21st.dev"). Generate variants, send Babak the chat URL, wait
   for his pick — never build your own HTML preview and pick a variant
   yourself. (See `CLAUDE.md` §10 for the full workflow.)
5. **Vercel:** never create a new project; deploy via git push only; verify
   HTTP 200 on a user-facing domain before reporting "shipped".
6. **Don't delete `src/pages/preview/v3/`.** It's intentional scratch space.
7. **i18n discipline:** if a page already uses `t()`, do not introduce raw
   English strings. Add keys to the locale JSONs in `src/i18n/`.
8. **Role checks:** `useUserRole()` + `user.user_metadata.signup_role`. Admins
   always fall into the adviser UX.
9. **Two Portfolio files exist:** `src/pages/Portfolio.tsx` (live) and
   `src/pages/preview/v3/Portfolio.tsx` (preview). Modify the live one
   unless asked otherwise.

---

## 11. Files to read in order

If you're a new agent or developer, read these first. Most should take 2–5
minutes each.

1. **`HANDOFF.md`** — this file.
2. **`CLAUDE.md`** — full project conventions.
3. **`src/App.tsx`** — route registry, the spine of the app.
4. **`src/index.css`** — design tokens (HSL CSS vars), aurora gradients.
5. **`src/components/HeroMetricCard.tsx`** — hero card pattern.
6. **`src/components/AIVerdict.tsx`** — AI verdict panel pattern.
7. **`src/components/layout/MobileNav.tsx`** — nav geometry to preserve.
8. **`src/hooks/useUserRole.tsx`** + **`src/components/ProtectedRoute.tsx`** —
   role + onboarding gates.
9. **`supabase/functions/dld-proxy/index.ts`** — DDA contract.
10. **`aws-relay/index.mjs`** — UAE relay wire protocol.
11. **`~/.claude/projects/-Users-babak-Projects-RealSight-Cowork/memory/MEMORY.md`** —
    current operational state (AWS relay, DDA creds, launch plan progress).

---

## 12. Out of scope for this doc

- **Full DB schema (column-level).** Read `src/integrations/supabase/types.ts`.
- **Operational runbooks** (rotating Lambda secrets, redeploying the relay,
  changing Supabase tiers). Those live in
  `~/.claude/projects/-Users-babak-Projects-RealSight-Cowork/memory/*.md`.
- **Marketing copy / brand voice.** Not part of a code handoff.
- **DDA API endpoint catalogue.** PDFs under `DDA API Docs/` at the repo
  root are the canonical reference.

---

*If anything in this doc disagrees with `CLAUDE.md`, `CLAUDE.md` wins for
conventions, and Babak wins for everything else. Ask before assuming.*
