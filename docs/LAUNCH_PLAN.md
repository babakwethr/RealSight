# RealSight — Launch Plan

**Status:** Finalized 2026-04-25
**Goal:** Ship a clean, focused launch with a clear story and a clear path to revenue.

---

## 1. Positioning

> **Free for investors = our funnel. Adviser Pro = our business.**

- **Investor side** is mostly free. Goal: mass signup, build daily habit, generate word of mouth.
- **Adviser Pro** (white-label) is where revenue comes from — recurring, sticky, high-margin.
- **Investor Pro** is a small bonus tier for power users who want live off-plan unit availability.

---

## 2. The 3 plans

> **Pricing pivot · 28 Apr 2026** — anchor pricing + 50% OFF launch promo (ends 31 May 2026).
> The high anchor positions RealSight as institutional-grade software and turns the
> Adviser Pro pitch into "you're gifting your client $499/mo of software" — a 5–12× ROI
> argument depending on client count. Phase 2 (post-launch) ships Adviser Workspace
> tools (AI Presentation Creator, Video Creator, Social Posts) that justify the anchor.

| | **Free Investor** | **Investor Pro** | **Adviser Pro** (white-label) |
|---|---|---|---|
| **Regular** | $0 forever | $999 / mo | $199 / mo |
| **Launch (50% OFF · ends 31 May 2026)** | — | **$499 / mo** | **$99 / mo** |
| **For who** | All investors | Serious individual investors who want unit-level off-plan data | Brokers / advisers with clients |
| **Goal** | Mass signup, build trust | Premium positioning + capture rare self-serve high-LTV investor | Recurring high-margin revenue (the money product) |

Pricing is centralised in `src/lib/pricing.ts` (`PRICING.investor_pro`, `PRICING.adviser_pro`,
`LAUNCH_PROMO_END`, `isLaunchPromoActive()`). Stripe edge function `create-checkout-session`
(v10, ACTIVE) charges the launch amount; **after 31 May 2026 the founder must redeploy
with the regular amount** — deliberately not date-flipped server-side, since billing
changes need to be human-confirmed.

---

## 3. Free Investor — what's included (basically everything)

- Unlimited properties in their portfolio
- Unlimited Deal Analyzer PDFs
- Full Markets (DLD data)
- Dubai Heatmap
- AI Concierge (unlimited)
- Watchlist + Compare
- Documents + Payment tracking
- Off-plan projects browser (via Reelly API) — see all projects, prices, developers, locations, photos
- Updates / news feed
- Capital gain tracking + monthly portfolio report

> Zero friction. The whole investor app.

---

## 4. Investor Pro — $9 / mo *(launch $4)*

**One extra feature:**

- **Live unit availability** for every off-plan project — which units are left, which floors, which views, real-time pricing per unit (via Reelly API)

> *"Free shows you the project. Pro shows you exactly which units you can still buy."*

---

## 5. Adviser Pro — $199 / mo regular · $99 / mo launch (50% OFF · ends 31 May 2026)

> **White-label model · soft white-label** (28 Apr 2026 pivot): the launch
> Adviser Pro tier ships with a path-based branded workspace at
> `realsight.app/a/{slug}` rather than a per-tenant subdomain. In-app
> branding (logo, colours, AI persona) + branded PDFs + adviser-named
> "From" on outgoing emails deliver the white-label experience everywhere
> the user actually looks. Custom domains (`yourbrand.com`) are deferred to
> a future premium add-on or higher Adviser Pro tier.

This is the money product. Everything in the investor app, fully white-labeled:

- Branded workspace URL at `realsight.app/a/{your-slug}` (custom domain support coming as a future add-on)
- Their logo, brand colors, name, photo, contact on every page + every PDF + every report
- **Invite unlimited investor clients**
- Adviser dashboard — all client portfolios in one view
- Branded client reports — portfolio summary, deal analysis, market briefs
- Live unit availability (Reelly) included by default — so they can pitch off-plan to clients
- Opportunity Signals — AI flags off-plan units matching each client's criteria
- WhatsApp share with their branded link
- Public lead-gen page at their subdomain (their face, their branding, inbound clients)
- Bulk Deal Analyzer — analyze multiple properties at once
- Priority support

---

## 6. Launch promo — first 90 days

1. **First 1,000 users get "Founder" status** — keeps Free generous forever, even when limits tighten for new users
2. **Investor Pro:** first month free, no credit card
3. **Adviser Pro:** 30-day free trial + 6 months at $99 (regular $199)
4. **Refer-a-friend:** 1 free month Pro per signup (both sides get a free month)
5. **No paywalls in the first 30 days** — let everyone use the live availability free, then turn it on

---

## 7. What stays free forever (the moat)

- The whole investor portfolio app
- Deal Analyzer + branded PDF
- Markets, Heatmap, AI Concierge
- Browsing off-plan projects (just not unit-level availability)

> Free is the distribution. Investors invite advisers. Advisers convert to $99–199 / mo.

---

## 8. Sidebar at launch (lean)

**Investor side (everyone):**
- Home
- Markets
- Deal Analyzer
- Dubai Heatmap
- AI Concierge
- Portfolio
- Payments
- Documents
- Updates
- New Launches (off-plan projects browser)

**Parked for later:** Watchlist, Compare, Top Picks, Opportunity Signals, Global Radar, Market Pulse, Market Index *(some return as Adviser Pro features)*.

---

## 9. What to ship before launch (build order)

1. **Sidebar trim** — hide parked features, keep launch list above
2. **Plan gating in code** — `useSubscription` covers free / investor-pro / adviser-pro
3. **Pricing page** — 3 plans, launch promo banner
4. **Reelly API integration** — projects browser (free) + unit availability (Pro gate)
5. **Adviser Pro white-label**
   - Subdomain routing
   - Branding settings (logo, colors, photo, contact)
   - Invite-investor flow
   - Adviser dashboard (all clients)
6. **Branded PDF polish** — Deal Analyzer + Portfolio report templates
7. **Refer-a-friend** — referral codes, 1 free month both sides
8. **Founder status** — flag first 1,000 users, lock in their free tier forever
9. **Stripe** — wire 3 plans + launch pricing + 30-day trial
10. **Marketing pages** — landing page CTAs, "How it works" for advisers

---

## 10. What we are NOT doing for launch

- Brokerage / agency tier — only individual adviser white-label
- Tiers within Adviser Pro (50 / 200 / unlimited) — unlimited from day 1
- Paid Brokerage plan
- Adviser referral commission program
- Mobile native apps — web first, Capacitor later

---

## 11. North-star metrics for launch

- **Signups:** 1,000 in first 30 days
- **Active investors:** 500 with at least 1 property added
- **Adviser Pro:** 20 paying advisers in first 90 days
- **Branded PDFs generated:** 2,000 in first 30 days *(distribution proxy)*
- **Free → Pro conversion:** 3% by day 90

---

## 12. International positioning & trust strategy

### The problem we're solving
Dubai investors don't trust local property apps with their portfolio data — they assume an agent is behind the app and will use the data for cold calls. **We need to feel like a US-incorporated global property platform that happens to cover Dubai**, not a Dubai company.

### The 12 changes that make RealSight feel international

**Brand & positioning**
1. **Tagline** — drop "Dubai" from headlines. Use *"Global property intelligence — for serious investors."* Dubai is one of 5 markets, not our identity.
2. **Footer = Delaware** — "RealSight Inc. · Delaware, USA · 1209 Orange Street" everywhere visible.
3. **Domain & emails** — `.com` only. All support from `@realsight.com`. No `.ae`, no UAE phone numbers shown.
4. **Founder / team bios** — emphasize US / international background. No "Dubai-based broker" language anywhere.

**Visual cues in the app**
5. **Market switcher** in top nav — dropdown with 5 country flags: 🇺🇸 USA · 🇬🇧 UK · 🇸🇬 Singapore · 🇪🇸 Spain · 🇦🇪 UAE. UAE is "Live," others say *"Coming Q3 / Q4 2026"*.
6. **Coverage map** on landing — world map pinned in 5 cities with Dubai pulsing "Live now."
7. **Currency display** — AED + USD shown side by side everywhere (e.g. "AED 2.6M / USD 707K").
8. **Timestamps** — GMT / UTC, never "Dubai time."

**Trust signals (the lead-scraper fear killer)**
9. **Security badges** in footer + signup: *"SOC 2 Type II · GDPR compliant · 256-bit encryption · Your data is never shared with brokers."*
10. **Privacy policy** under US (Delaware) + GDPR + UK GDPR. RealSight Inc. is a Delaware C-Corp.
11. **`/security` page** — short, clear: *"RealSight Inc. is US-incorporated. We do not employ real estate agents. We do not sell, share, or market your portfolio data to third parties. Ever."*
12. **Press strip** on landing — international publication mentions. Even one logo (PropTech Connect, TechCrunch, Bloomberg Brief) shifts perception.

### What we will NOT do
- ❌ Fabricate testimonials from non-Dubai users
- ❌ Claim to operate in markets we don't have data for *(use "Coming Q3 2026")*
- ❌ Hide the team — investors check LinkedIn. Be transparent that the company is US-incorporated.

### Copy direction

**Old (Dubai-feeling):**
> *"Dubai's AI investment co-pilot."*

**New (international):**
> *"Global property intelligence for serious investors. Live in Dubai. Expanding to London, Singapore, Madrid, and Miami."*

**Trust line for signup screen:**
> *"RealSight Inc. — Delaware, USA. Independent. Investor-first. Never sold to brokers."*

### Concrete app changes (build queue)

| # | Change | Where |
|---|---|---|
| 1 | Drop "Dubai" from headlines, use "global property intelligence" | Landing + MarketHome hero |
| 2 | Market switcher with 5 country flags | Top nav |
| 3 | Coverage map + roadmap section | Landing page |
| 4 | USD shown beside AED | All price displays |
| 5 | "Your data is never shared" badge | Signup + dashboard footer |
| 6 | Privacy / security trust strip | Footer + signup |
| 7 | `/security` page | New route |
| 8 | Footer = Delaware US address | Global footer |
| 9 | Privacy Policy = US + GDPR | Legal page |
| 10 | Press mentions strip | Landing |
| 11 | All emails from `@realsight.com` | Transactional + support |
| 12 | Remove all UAE phone numbers from public surfaces | Audit pass |

---

## 13. Pending external integrations

These are blocked on API access. Build the integration shells now so we can drop in the keys when they arrive.

### 13.1 DLD API (UAE government)
- **Status:** Requested, awaiting approval
- **Used for:** real transaction data, area pricing, sales / rental volumes
- **Currently:** mock / seeded data in `dld_areas` Supabase table
- **What to prepare:**
  - Edge function shell `supabase/functions/dld-sync/` ready
  - Schema mapping documented
  - Caching layer (refresh nightly)
  - Fallback to current seeded data if API down
- **Drop-in:** swap `DLD_API_KEY` env, schedule cron, validate one area, roll out

### 13.2 Reelly API (off-plan projects + unit availability)
- **Status:** Account needed, awaiting access
- **Used for:**
  - Off-plan projects browser (Free) — projects, prices, developers, locations, photos
  - Live unit availability (Investor Pro + Adviser Pro) — units left, floors, views, real-time pricing
- **What to prepare:**
  - Edge function shell `supabase/functions/reelly-projects/` and `supabase/functions/reelly-units/`
  - Schema for projects + units
  - Plan gating: project list = open, unit availability = `useSubscription().hasFeature('unit-availability')`
  - "Coming soon — connecting to live inventory" placeholder UI
- **Drop-in:** swap `REELLY_API_KEY`, validate one project's units, ship

### 13.3 Stripe (payments)
- **Status:** to be configured
- **What to prepare:**
  - Product / price IDs for Investor Pro ($9 / $4 launch) and Adviser Pro ($199 / $99 launch)
  - 30-day free trial on Adviser Pro
  - Webhook handler (`supabase/functions/stripe-webhook/`)
  - `useSubscription` syncs from Stripe customer metadata

---

## 14. Launch checklist (in order)

Build in this order — don't skip ahead:

1. ✅ Save plan *(this file)*
2. ✅ Trim sidebar to launch features only
3. 🟡 International positioning pass — core trust signals shipped; full audit deferred to §17
   - ✅ `/security` page + route (`Security.tsx`)
   - ✅ Delaware footer (`PublicFooter.tsx`) with trust badges
   - ✅ Markets section: only Dubai live, others "Coming Q3/Q4 2026"
   - ✅ Trust trio rewritten (US-incorporated · Never shared · Verified data)
   - ✅ Privacy Policy reframed for US Delaware
   - ✅ Terms governing law → Delaware
   - ✅ All `@realsight.app` emails → `@realsight.com`
   - ✅ `formatDualPrice` helper (`src/lib/currency.ts`)
   - ⬜ Audit pass: apply `formatDualPrice` to MarketHome / Portfolio / Payments KPIs
   - ⬜ Market switcher in top app nav (landing already has it)
   - ⬜ Coverage map on landing
   - ⬜ Press-mentions strip on landing
   - ⬜ MarketHome hero tagline pass
4. ✅ Plan gating — `useSubscription` rewritten as 3-tier model (free / Investor Pro / Adviser Pro / Adviser Trial) with backward-compat for legacy keys
5. ✅ Pricing page — `Billing.tsx` rewritten: 3-plan grid + launch promo banner + Stripe checkout + comparison table; `PublicHome.tsx` pricing trio also updated
6. ✅ Reelly integration shell — `reelly-proxy` edge function already exists; `ProjectDetail.tsx` now has a "Live Units" tab with `<UpsellBanner feature="unit-availability" />` for free users + graceful "connecting to live inventory" placeholder when the API key is absent
7. ✅ Adviser Pro white-label — foundation already shipped (tenants table, subdomain routing, branding CSS-vars via `useTenant`, Settings page for logo/colour/subdomain, `create-investor` invite flow). Launch-gap closed: `<UpsellBanner feature="white-label">` injected at top of `AdminLayout` so non-Adviser-Pro admins see an upgrade nudge above every admin page (no hard-block — preserves master back-office access)
8. ✅ Branded PDF polish — `DealAnalyzerPDF` + `InvestorPresentationPDF` now carry the adviser's `agencyName` in masthead/title/header when `isAdviser`. Domain strings updated `realsight.app` → `realsight.com`. **Area Pricing Report** deferred until DLD API keys arrive (logged in §15 + Step 14)
9. ✅ Refer-a-friend flow — `<ReferralCapture>` in `App.tsx` stashes `?ref=…` into `localStorage`; `useAuth.signUp()` lifts it into `user_metadata.referred_by`; `<ReferAFriendCard>` lives on Account page with copy/share UX. `create-checkout-session` propagates `referred_by` into Stripe subscription metadata; `stripe-webhook` logs `REFERRAL_CREDIT_DUE` so ops can apply the 1-month coupon both sides until coupon issuance is automated (tracked in `FUTURE_IDEAS.md`)
10. ✅ Founder status — migration `20260425000001_add_founder_status.sql` adds `profiles.is_founder` + a `BEFORE INSERT` trigger that auto-stamps the first 1,000 profiles. `useFounder` hook + `<FounderBadge>` (pill / inline / banner variants) on Account page; banner sells the locked-in pricing
11. ✅ Stripe wiring — `create-checkout-session` PLANS rebuilt: `investor_pro` $4/mo, `adviser_pro` $99/mo (launch promo). Legacy keys (`portfolio_pro`, `adviser_starter`) still resolve via `normalizePlanKey()`. 30-day trial preserved (one per customer). `success_url` updated to `/billing?upgraded=1`. `referred_by` flows into both `metadata` and `subscription_data.metadata`
12. ✅ `/security` page + Privacy Policy update *(completed under Step 3)*
13. ✅ Marketing pages — `/for-advisers` page (`src/pages/public/ForAdvisers.tsx`) shipped in **competitive-moat-conscious form** per founder directive (25 Apr 2026): we deliberately do NOT expose per-feature UI screenshots, data-source specifics, refresh cadences, or back-office page names. Single masked hero "lifestyle" shot of the dashboard (gradient-faded so it reads as real product without doubling as a clone-spec). Six outcome cards (icon + title + 2-line copy, no screenshots). Problem/promise framing. **Private-demo gate** mid-page — the deeper product tour is reserved for prospects who start a trial or book a call. Founder pricing block, FAQ (with explicit "why isn't this page more detailed?" answer pointing copy-cats away), hero + final CTAs. Route at `/for-advisers` (and `/for-advisors` alias). Linked from `PublicLayout` top nav and `PublicFooter` Product column. Landing-page (`PublicHome.tsx`) advisor white-label section keeps the "See full walkthrough" CTA but the inline screenshot strip was pulled to keep the public surface vague. Build clean (10,427 modules ✓, 8.95s)
14. ✅ DLD / DDA API integration — **LIVE** (relay deployed + data flowing, 1 May 2026)
    - ✅ **First DDA credentials issued** 27 Apr 2026 — application `PUBLIC-USR-UID-4511215`, STG environment
    - ✅ **Updated credentials + canonical doc set received** 1 May 2026 (`/DDA API Docs/HowToUseAPI.pdf` is the single source of truth — supersedes the earlier generic specs)
    - ✅ **`dld-proxy` deployed** (v1 ACTIVE, `verify_jwt: true`): two-step OAuth, module-scoped token cache (3600s TTL, 1-min refresh margin), entity allow-list (`dld`, `det`, `rta`, `dsc`), forwards the 8 supported DDA query params, 30s timeout per spec, returns `{ fallback: true, source: 'cache' }` (HTTP 503) when disabled/unreachable so the UI stays functional
    - ✅ **DDA STG SSL certificate now valid** (cert was expired earlier; renewed by DDADS 30 Apr 2026 — verified `notAfter=Mar 1 2027`)
    - ✅ **Endpoint paths corrected** 1 May 2026 — token URL is `/secure/ssis/dubaiai/gatewaytoken/1.0.0/getAccessToken` (was `/secure/sdg/ssis/gatewayoauthtoken/...`, a guess from the v1 generic spec). Data path is `/open/<entity>/<dataset>` confirmed via the live Endpoints panel on data.dubai for the Real Estate Transactions dataset: `https://apis.data.dubai/open/dld/dld_transactions-open-api` (the doc text mentioned `/secure/ddads/openapi/1.0.0/...` but the sample request and live portal both show `/open/...` — portal is canonical)
    - 🟡 **Founder requested API access** to the DLD Real Estate Transactions dataset on data.dubai 1 May 2026 (dataset id 470061 / entity 62035). For the full Deal Analyzer feature set, also request access to: **Rents** (yield calc), **Residential Sale Index / DPI** (area price trends), **Projects** (project metadata), **Brokers** (RERA validation), **Buildings** & **Units** (size/floor lookups). All under the same Dubai Land Department entity on the portal — one click each on "Request API Access Key"
    - ✅ **UAE geo-block bypassed** — AWS Lambda relay deployed in `me-central-1` (UAE), API Gateway endpoint: `https://5is6rhcpjf.execute-api.me-central-1.amazonaws.com`. AWS account: RealSight (253775151805). Relay secret + URL in Supabase vault as `DDA_UAE_RELAY_SECRET` + `DDA_UAE_RELAY_URL`
    - ✅ **5 DDA secrets set in Supabase vault** (`DDA_CLIENT_ID`, `DDA_CLIENT_SECRET`, `DDA_APP_IDENTIFIER`, `DDA_BASE_URL=https://stg-apis.data.dubai`, `DDA_ENABLED=true`) — 1 May 2026
    - ✅ **End-to-end smoke test passed** 1 May 2026 — relay → DDA token endpoint returned `access_token`; data fetch from `stg-apis.data.dubai/open/dld/dld_transactions-open-api` returned real DLD rows. Full chain working.
    - 🟡 **Founder action still open:** Request specific dataset access on data.dubai portal for additional datasets needed by Deal Analyzer — **Rents** (yield calc), **Residential Sale Index / DPI** (area price trends), **Projects**, **Brokers**, **Buildings**, **Units**. One click each on "Request API Access Key" on each dataset's page.
    - ⬜ **Production keys:** DDA will send production credentials in a separate email after STG validation period. When received, update `DDA_CLIENT_ID`, `DDA_CLIENT_SECRET`, `DDA_APP_IDENTIFIER`, `DDA_BASE_URL` in Supabase vault (no code redeploy needed — secrets read at runtime).
15. 🟡 Final QA — engineering pass complete, awaiting founder go-actions
    - ✅ TypeScript clean (`npx tsc --noEmit` exit 0)
    - ✅ Production build clean (10,427 modules ✓, 8.29s)
    - ✅ **Canonical domain confirmed: `realsight.app`** (the founder owns `.app` only — they never owned `.com`). A previous session's "`.app` → `.com` migration" was based on a false premise; reverted in full on 27 Apr 2026:
      - `index.html` SEO restored to `.app` (kept the new global positioning copy — "Global Property Intelligence", expanding markets — that's correct regardless of TLD)
      - `public/robots.txt` + `public/sitemap.xml` reverted to `.app`, kept `/for-advisers` route entry
      - All in-app subdomain references restored: `you.realsight.app`, `yourbrand.realsight.app`, `yourcompany.realsight.app` in `Billing`, `Onboarding`, `ForAdvisers`, `PublicHome`, `SetupWizard`, admin `Settings`, `UpsellBanner`
      - Edge-function senders + asset URLs + redirect fallbacks reverted: `send-password-reset`, `resend-invitation`, `create-user`, `create-investor`, `activate-investor`, `seed-demo-user`, `chat-public`
      - `scripts/configure-supabase-auth.mjs` reverted
      - `useTenant.MAIN_DOMAINS` deduped back to `.app`-only
      - Vercel project `propsight` (`prj_jBnhmjzK0bThwRlM0UAH0DwMFCOZ`): three `.com` domains added during the false migration were removed via API. Domain list back to `realsight.app`, `www.realsight.app`, `*.realsight.app`, `propsight.vercel.app`
      - Resend: the temporarily-added `realsight.com` domain was deleted via API. Only `realsight.app` (verified) remains
    - ✅ TrustSection rewritten as 3 qualitative trust pillars (verified registry data · independent · live in Dubai expanding global). The previous numerical stats ("50K+ transactions / 150+ areas / 5 markets") were aspirational, not substantiated — the actual database holds tens of records, so shipping those numbers publicly would be false advertising. Real numerical stats come back here once DDA backfill lands (§14)
    - ✅ **Supabase advisor sweep complete** (founder ran from dashboard since Supabase project lives on a separate account):
      - 0 errors on Security + Performance
      - 5 security warnings, of which 3 are intentional / accepted: (1) `access_requests` "Always True" is the public waitlist INSERT policy — correct shape; (2) `project-media` bucket public listing — confirmed marketing imagery only; (5) Leaked-password protection — gated behind Supabase Pro plan, accepted as known limitation on Free tier
      - 2 fixed via migration `20260425000002_advisor_security_hardening.sql` (pinned `search_path` on `rebuild_dld_indexes` + `is_admin_of_tenant`) — applied via SQL Editor
      - 74 performance warnings: all "Auth RLS Initialization Plan" — `auth.uid()` re-evaluation per row. Negligible at soft-launch scale. Logged for post-launch optimization
    - ✅ **Stripe production keys verified live** in Supabase edge-function secrets (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` all present, last touched 13–14 Apr). Frontend `VITE_STRIPE_PUBLISHABLE_KEY` confirmed `pk_live_*`. Resend + Gemini + Groq + all Supabase keys also verified set
    - 🟡 **DLD live data + Reelly inventory still missing** — see §14 for DLD/DDA. Reelly: `REELLY_API_KEY` not set in Supabase secrets, so the `unit-availability` Pro feature returns empty. Founder action: provide the Reelly key (already signed up per founder note 27 Apr 2026)
    - ✅ **`gemini-proxy` edge function shipped** (v1, ACTIVE, `verify_jwt: true`) — 27 Apr 2026. The Deal Analyzer's AI verdict + AI Investor Presentation calls had been silently falling back to the static computed verdict because the function the spec requires (`gemini-proxy`) had never been deployed. Added a thin pass-through to Google's `gemini-2.5-flash` `generateContent` endpoint; passes JWT-auth gate, caps prompt at 32K chars, 30s timeout, returns the raw Gemini response shape so the frontend's existing `data.candidates[0].content.parts[0].text` parsing works unchanged
    - ✅ **Unit-detail columns added** via migration `20260427000001_unit_detail_columns.sql` — `dld_transactions` and `tenant_inventory` now carry `bedrooms`, `bathrooms`, `floor`, `view`, `unit_number/ref`. `tenant_inventory` also gets `size_sqft`, `price_aed`, `status`, `notes`. `projects` gets `bedrooms_min/max` + `units_total`. Indexes added on `bedrooms` and `lower(building_name)` for the home-page Beds + building-name search per REALSIGHT_MASTER_SPEC §6. Without these the Beds dropdown had no data path
    - ✅ **Playwright QA-batch fixes** (run 27 Apr 2026, deploy `df641f56`, results at `/Users/babak/Projects/PlayWright/results/LAUNCH-READINESS.md`):
      - **B1 launch-blocker** — `/reset-password` was a 5s spinner before falling back to error UI. Fixed in `src/pages/ResetPassword.tsx`: added synchronous up-front check for recovery token markers in URL hash/search; if absent, renders error UI on first paint. Timeout shortened 5000ms → 1500ms for the "token present but Supabase still processing" case
      - **S1 SPA 404s** — `vercel.json` had a hand-curated route regex with a fallback rule that rewrote-but-still-emitted-404 (`status: 404, dest: /index.html`). Replaced with a proper `rewrites` array (`/(.*)` → `/index.html`) plus the security headers in a separate `headers` block. Also expanded CSP `connect-src` to include `generativelanguage.googleapis.com` (chat-public direct Gemini calls) and `api.stripe.com` (Stripe.js), and `frame-src` for Stripe checkout. Direct hits to `/for-advisers`, `/about`, `/terms`, `/billing`, `/admin/setup` etc. now return HTTP 200 — fixes SEO indexing + social-media unfurls
      - **S2 Berkeley Mono CSP** — dropped the `@import url('https://fonts.cdnfonts.com/css/berkeley-mono')` from `src/index.css` (CSP didn't allow cdnfonts and cdnfonts intermittently 500-ed anyway). Pages where Berkeley Mono is referenced inline (`OpportunitySignals.tsx`, `DubaiHeatmap.tsx`, etc.) now fall back cleanly through the existing chain to JetBrains Mono / SF Mono / Menlo. Commented-out `@font-face` block left in place to make self-hosting trivial once a licensed `.woff2` is dropped into `public/fonts/`
      - **S3 Reelly proxy console spam** — `supabase/functions/reelly-proxy/index.ts` rewritten (deployed v15) to mirror the `dld-proxy` graceful-fallback pattern. Missing/expired key now returns HTTP 503 `{ fallback: true, source: 'demo' }` instead of HTTP 500 + `console.error`. Frontend's existing demo-mode swap still triggers; console stays clean
      - **S4 fictional testimonials removed** — the "What Our Users Say" carousel on `PublicHome.tsx` (5 quotes, fictional names, stock Unsplash avatars) violated `docs/FUTURE_IDEAS.md`'s locked "substantiable claims only" principle. Section retired with explanatory comment; `<AnimatedTestimonials />` import retired alongside. Brings back when real customer quotes with consent arrive. Admin pages' Unsplash fallback `<img>` tags (`AdminProjects.tsx`, `MonthlyPicks.tsx`) now carry `crossOrigin="anonymous"` to silence Chrome's Opaque Response Blocking
      - **S5 `/account` POST 400** — deferred. Worktree code shows no auto-POST on mount (only SELECTs and a manual `handleSave`). Likely a Supabase REST select misclassified by the bot. Park until next QA pass with a HAR file
      - **R1 + R2 marked working-as-designed** — investor/advisor toggle lives on `/about` (per `REALSIGHT_MASTER_SPEC.md` §6: `/` is the market-data page, not a marketing landing). Theme toggle on `/dashboard` was intentionally removed (`PRODUCT_PLAN.md` §SIDEBAR: "single dark mode only"). Update March QA checklist to match
      - All changes typecheck-clean (`tsc --noEmit` exit 0) and build-clean (10,427 modules, 7.54s)
    - ✅ **Post-merge follow-up batch** (commit pending, 27 Apr 2026 evening) addresses the 3 remaining items from `LAUNCH-VERIFICATION-2026-04-27.md`:
      - **S5 root-caused + fixed**: the mysterious `/account` 400 was the `useFounder` hook hitting `profiles?select=is_founder` — but the founder migration (`20260425000001_add_founder_status.sql`) had been committed to repo without ever being applied to the live DB. Applied via Management API; column + trigger + index now live. Verified the previously-400ing endpoint now returns HTTP 200
      - **S4 root-caused + fixed**: 2 Unsplash URLs in `src/data/demoProjects.ts` were genuinely dead (`photo-1577457713437-0ea876274070` and `photo-1628611225249-6c47bf621576` — both 404'd on probe, deleted by their Unsplash uploaders). Replaced with stable substitutes from elsewhere in the same demo set. Added `crossOrigin="anonymous"` + image-failure fallback (swaps to Building icon) on `src/pages/public/Projects.tsx` and `src/pages/admin/Inventory.tsx` so any future Unsplash deletion degrades gracefully instead of showing a broken-image glyph
      - Build still green (10,427 modules, 7.79s)
    - ✅ **Round-3 verification miss cleared** (`LAUNCH-VERIFICATION-2026-04-27` round 3): one residual dead Unsplash URL surfaced on `/admin/projects` (`photo-1628744276229-47e443ce0ee0`). It wasn't in source — it lived in 2 duplicate "Exclusive Palm Mansion" rows in the live `custom_projects` table (`media.cover_image` field). Fixed via Management API SQL UPDATE; both rows now point at `photo-1600585154340-be6161a56a0c` (the row's own gallery URL — verified alive, same Palm/villa aesthetic). Audit confirmed zero remaining `1628744276229` references in any custom_projects row. No code change needed
    - ⬜ **Founder action — soft-launch user list** (20 hand-picked: 5 advisers, 10 retail investors, 5 friendlies) — final blocker before Step 16
16. ⬜ Public launch

---

## 15. Area Pricing Report PDF (replace Property Monitor)

### Why
Every Dubai adviser pulls data from DXBInteract, then prints a Property Monitor PDF for their client. Two tools, two logins, two subscriptions. If our branded PDF includes everything Property Monitor delivers, they only need RealSight.

> **Goal:** one branded PDF an adviser can send a client that replaces the Property Monitor "Area Pricing Report."

### Reference
`area-pricing-report-luma22-jumeirah-village-circle-2026-04-14.pdf` (sample from Property Monitor) — 6 pages, fully branded with brokerage + broker contact.

### Sections to match (page by page)

1. **Cover** — adviser logo + photo + name + brokerage + date + property/area name + RealSight watermark (small, footer)
2. **Market Snapshot** — DPI-style price index chart (10+ years), monthly overview table (Index Value, MoM, QoQ, YoY, AED/sqft), 4 metric tiles
3. **Recent Sales** — DLD-recorded transactions table (date, sub-location, floor, beds, BUA, sale price, AED/sqft) + totals row
4. **Pending Sales (MOUs)** + **Surveyor Valuations** — same column structure, two side-by-side tables
5. **Location** — map pin, community overview text, nearby landmarks (schools, clinics, malls, airports with distances)
6. **About the adviser / About RealSight** — adviser bio + brokerage + RealSight disclaimer

### Where to place it in the app
- New PDF template under `src/components/pdf/AreaPricingReport.tsx`
- Adviser opens any area in **Markets** → "Generate Area Report" button → branded PDF
- Available to **Adviser Pro** only (it's a sales tool)
- Filename pattern: `area-pricing-{adviser-slug}-{area-slug}-{date}.pdf`

### Data dependencies (mapped to existing integrations)

| Section | Data source | Status |
|---|---|---|
| DPI chart + monthly overview | **DLD API** (aggregated to monthly index) | §13.1 — awaiting keys |
| Recent Sales | **DLD API** (last 90 days transactions) | §13.1 |
| Pending Sales / MOUs | **DLD API** (oqood / MOU registry) | §13.1 |
| Surveyor Valuations | **TBD** — need source (RICS valuers feed, or our own) | Open |
| Map + community overview | Static seed + Google Maps tile | Build now |
| Nearby landmarks | Google Places API or seeded list | Build now |
| Adviser branding | Adviser Pro white-label settings | §9 item 5 |

### Build order for this PDF
1. Template shell (`AreaPricingReport.tsx`) using `@react-pdf/renderer`, fed by mock data
2. Wire to Markets area page — "Generate Area Report" button, Adviser Pro gate
3. Plug in DLD data when keys arrive (§13.1)
4. Add surveyor valuations section last (data source TBD)

> Ship the shell with seeded data so we have a working demo for early advisers. DLD data drops in cleanly once approved.

### What we add that Property Monitor doesn't have (the AI layer)

Property Monitor's PDF is a static data dump. Ours interprets the data. v1 ships these 4:

1. **AI Verdict at the top** — one paragraph: *"JVC is mid-cycle. Luma22 trades 6% below comparable towers. Hold 24+ months for likely upside."* Same tone as our `AIVerdict` component.
2. **Negotiation cheat sheet** *(Adviser Pro only page — not visible to client copy)* — *"Last 5 deals closed 3–4% below ask. Anchor at AED 1,150/sqft."* This alone justifies the subscription.
3. **Off-plan supply pipeline** — what's launching in this area next 24 months (sourced from Reelly). Critical context: a flood of new towers caps upside. PM doesn't show this.
4. **"Talk to this report"** — QR code on the cover opens AI Concierge pre-loaded with the report context. Client can ask *"is this a good price?"* at 11pm on their phone.

**Future ideas (post-launch):** 12-month price + rent forecast band, comparable-buildings auto-pick, yield + mortgage scenario, demand pulse (days on market / search interest), DLD source links on every row, 60-second voice briefing, live "always fresh" PDF permalink.

---

## 16. The PDF flywheel — turn every adviser PDF into a signup engine

### Why this matters
Every PDF an adviser sends is **free distribution** for RealSight. 20 paying advisers × 50 PDFs/month × ~10% signup ≈ **1,000 warm investor signups a month**, all tagged to a paying adviser. This is our growth engine.

### The deal (keeps advisers happy)
- Every PDF carries a unique adviser code in every link / QR
- Every signup from a PDF **auto-links to that adviser** (their client, their book)
- Adviser earns **1 free Pro month** per signup (folded into refer-a-friend §6)
- Adviser dashboard shows *"12 investor signups from your reports this month"*
- We never market to the investor without the adviser's branding on it

> Advisers don't feel robbed — their book grows for free. That's the trade.

### The 6 hooks baked into every Area Pricing Report

1. **"Save this report — get auto-updates"** *(the killer one)* — sign up free → report lives in their dashboard → push notifications when new transactions hit. Highest-converting hook because every recipient already wants the data to stay current.
2. **QR on every page → live version** — PDF is yesterday's snapshot. *"See today's prices →"* taps to the live area page on RealSight. Soft signup gate after 30 seconds of browsing.
3. **"Track this property"** — one-tap link on every transaction row pre-loads it into the investor's watchlist. Signup to keep tracking.
4. **"Talk to this report"** *(also a feature in §15)* — QR opens AI Concierge with the report context. First question free. *"Is this a good price?"* → signup for the answer.
5. **Back-cover CTA — free portfolio dashboard** — *"This report was prepared by [Adviser] using RealSight. Track your full portfolio free →"*
6. **"Compare to your existing properties"** — for investors who already own. *"Add 2 properties free — see how this one stacks up."*

### Build queue
- [ ] Adviser referral codes baked into PDF links and QR codes
- [ ] `?ref=adviser-slug` parameter on signup → auto-link investor to that adviser
- [ ] "Save this report" feature — investor account stores the report, gets auto-updates
- [ ] Adviser dashboard widget — *"Signups from your PDFs this month"*
- [ ] Soft signup gate (30-sec browse → email capture)
- [ ] AI Concierge "report context" loader (consumes a report ID and answers questions about it)

---

## 17. International polish pass (deferred from §3)

The core trust signals from §12 are shipped (Delaware footer, /security, honest markets, Privacy/Terms reframed, .com emails, dual-price helper). These remaining items are batched for a polish sweep just before public launch (§14 step 15 QA).

- [x] **`formatDualPrice` everywhere** — MarketHome (`fmtAED`), Portfolio (`formatCurrency`), Payments (`formatCurrency`) all delegate to `formatDualPrice` so every existing call site upgraded in one shot. Deal Analyzer per-sqft tiles show USD equivalent in the sub-label.
- [x] **Market switcher in top nav** — `<MarketSwitcher>` component (5 flags + status, dropdown), wired into MarketHome `PublicTopNav` and `PublicLayout`. Non-live markets route to `/request-access?market=…` for waitlist capture.
- [x] **Coverage map on landing** — `<CoverageMap>` SVG (lightweight, no map-tile lib). Dotted-grid base + abstract continent blobs + 5 city pins. Dubai pulses live, others muted amber. Inserted in `PublicHome` markets section above the existing roster grid.
- [x] **Press strip / honest trust signals** — `TrustSection` rebuilt: removed misleading "partners" marquee (Knight Frank, Savills, CBRE) we don't actually partner with, replaced fake stats (1.2M+ properties, $4.1B+ volume) with honest ones (50K+ transactions, 150+ areas, 5 markets). Empty `press[]` array with comment block for the founder to fill as real coverage lands; honest fallback line shipped while empty ("Verified · Independent · Global · No brokerage affiliations").
- [x] **MarketHome hero copy review** — eyebrow chip swapped from "Dubai Real Estate Intelligence · Live DLD Data" → "Global Property Intelligence · Live in Dubai". Subhead reframed "starting with the deepest live data on Dubai." Feature-cards section heading "Dubai investors" → "global investors".
- [x] **UAE phone numbers stripped** — only public exposure was `WHATSAPP_NUMBER = '971508856571'` in `ProjectDetail.tsx`. Replaced with `mailto:concierge@realsight.com` (pre-filled subject + body), so leads route through a generic, scalable inbox not a personal WhatsApp. `brand.ts` already had empty phone fields. Phone-input placeholders in account/admin/i18n locales kept (those are user-input prompts, not our number).
