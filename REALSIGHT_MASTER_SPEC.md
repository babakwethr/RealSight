# RealSight — Master Product Specification
> Created: April 2026. This is the single source of truth.
> DO NOT start coding until this document is reviewed and approved by Babak.
> All future development decisions must reference this document first.

---

## 1. WHAT REALSIGHT IS

RealSight is a Dubai real estate intelligence SaaS. It serves two audiences:
- **Investors** — individuals tracking, analysing, or buying property
- **Advisers** — real estate agents/brokers who serve investor clients

The product bypasses a marketing landing page. The platform IS the pitch — users land on live DLD market data immediately (like DXBinteract), and convert through feature gates when they hit locked content.

---

## 2. USER TYPES

| Type | Who | How they sign up |
|------|-----|-----------------|
| **Public (no login)** | Anyone visiting realsight.app | No account needed |
| **Explorer** | Investor with free account | Self-serve signup |
| **Portfolio Pro** | Investor, paid $29/mo | Self-serve, Stripe |
| **Adviser Starter** | Agent/broker, paid $99/mo | Self-serve, Stripe |
| **Adviser Pro** | Top-tier agent, paid $199/mo | Self-serve, Stripe |
| **Adviser Trial** | Same access as Adviser Pro, temporary | Admin-granted |

---

## 3. PRICING MODEL

| Plan | Price | Who it's for |
|------|-------|-------------|
| Explorer | Free | Investors starting out |
| Portfolio Pro | $29/month | Serious investors who want full market data + deal analysis |
| Adviser Starter | $99/month | Agents who want market intelligence + client tools |
| Adviser Pro | $199/month | Top agents who need AI presentations + advanced tools |

**Stripe setup:** create-checkout-session + stripe-webhook Edge Functions deployed. Plans stored in user_metadata.plan AND tenants.subscription_tier.

---

## 4. FEATURE ACCESS MATRIX

### 4.1 Home Page / Market Data (realsight.app)

| Feature | Public (no login) | Explorer | Portfolio Pro | Adviser Starter | Adviser Pro |
|---------|:-----------------:|:--------:|:-------------:|:---------------:|:-----------:|
| Search bar (area/project/developer) | ✅ Free | ✅ | ✅ | ✅ | ✅ |
| Area pills filter | ✅ Free | ✅ | ✅ | ✅ | ✅ |
| Time period tabs | ✅ Free | ✅ | ✅ | ✅ | ✅ |
| 5 KPI cards (Median Price, PSF, Volume, Yield, Market Score) | ✅ Free | ✅ | ✅ | ✅ | ✅ |
| 12-month price trend chart | ✅ Free | ✅ | ✅ | ✅ | ✅ |
| Transaction volume chart | ✅ Free | ✅ | ✅ | ✅ | ✅ |
| Area performance table | ✅ Free | ✅ | ✅ | ✅ | ✅ |
| "Analyse My Property" button | → login | ✅ | ✅ | ✅ | ✅ |
| Unique features showcase section | ✅ Free | ✅ | ✅ | ✅ | ✅ |

> **CRITICAL:** The entire home page market data is FREE and PUBLIC. No login required to browse.
> Searching, filtering, viewing KPIs, charts, and the area table — all free.
> Only clicking into locked features (Deal Analyzer, etc.) triggers a feature gate.

---

### 4.2 Market Intelligence (/market-intelligence)

| Feature | Public | Explorer | Portfolio Pro | Adviser Starter | Adviser Pro |
|---------|:------:|:--------:|:-------------:|:---------------:|:-----------:|
| View area page (basic stats) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Full area deep-dive (charts, history, comparable) | 🔒 | 🔒 | ✅ | ✅ | ✅ |
| Dubai Heatmap | 🔒 | 🔒 | ✅ | ✅ | ✅ |
| Market Index | 🔒 | 🔒 | ✅ | ✅ | ✅ |
| Watchlist | 🔒 | 🔒 | ✅ | ✅ | ✅ |
| Compare areas/projects | 🔒 | 🔒 | ✅ | ✅ | ✅ |

---

### 4.3 New Launches (/projects)

| Feature | Public | Explorer | Portfolio Pro | Adviser Starter | Adviser Pro |
|---------|:------:|:--------:|:-------------:|:---------------:|:-----------:|
| Browse project listings (name, developer, location, price range) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Unit availability (floor numbers, sizes, exact pricing) | 🔒 | 🔒 | ✅ | ✅ | ✅ |
| Share project links with clients | 🔒 | 🔒 | 🔒 | ✅ | ✅ |
| AI Investor Presentation from project | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |

---

### 4.4 Deal Analyzer (/deal-analyzer)

| Feature | Public | Explorer | Portfolio Pro | Adviser Starter | Adviser Pro |
|---------|:------:|:--------:|:-------------:|:---------------:|:-----------:|
| Access Deal Analyzer page | 🔒→login | ✅ | ✅ | ✅ | ✅ |
| Run analysis (URL or form entry) | — | ✅ | ✅ | ✅ | ✅ |
| AI investment verdict (on screen) | — | ✅ | ✅ | ✅ | ✅ |
| Deal Analysis PDF report (download) | — | 🔒 | ✅ | ✅ | ✅ |
| AI Investor Presentation PDF (download) | — | 🔒 | 🔒 | 🔒 | ✅ |

> Explorer users can run a full analysis and see results on screen — but PDF download requires Portfolio Pro+.
> Deal Analyzer PDFs: if logged in as Adviser → adviser name/contact on report. If Investor → RealSight branding.

---

### 4.5 Portfolio (/portfolio)

| Feature | Public | Explorer | Portfolio Pro | Adviser Starter | Adviser Pro |
|---------|:------:|:--------:|:-------------:|:---------------:|:-----------:|
| Access portfolio page | 🔒→login | ✅ | ✅ | ✅ | ✅ |
| Add properties / holdings | — | ✅ | ✅ | ✅ | ✅ |
| View total invested / current value | — | ✅ | ✅ | ✅ | ✅ |
| Payment schedule tracking | — | ✅ | ✅ | ✅ | ✅ |
| Document vault | — | ✅ | ✅ | ✅ | ✅ |
| Portfolio growth chart | — | ✅ | ✅ | ✅ | ✅ |

> Portfolio is FREE for all logged-in users (Explorer and above). It's how we hook investors.

---

### 4.6 Opportunity Signals & AI Tools

| Feature | Public | Explorer | Portfolio Pro | Adviser Starter | Adviser Pro |
|---------|:------:|:--------:|:-------------:|:---------------:|:-----------:|
| Opportunity Signals | 🔒 | 🔒 | 🔒 | ✅ | ✅ |
| Global Radar | 🔒 | 🔒 | 🔒 | ✅ | ✅ |
| Top Picks | 🔒 | 🔒 | 🔒 | ✅ | ✅ |
| AI Concierge (limited) | 🔒 | ✅ limited | ✅ limited | ✅ unlimited | ✅ unlimited |
| AI Market Analysis Reports | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |

---

## 5. FEATURE GATE BEHAVIOUR

When a user hits a locked feature, show a popup (NOT a full page). The popup:
- Shows a lock icon + plan name + price
- Shows "Also included with [Plan]:" grid of 4-6 features (value stacking)
- Has a CTA button: "Upgrade — $29/mo →" (or relevant price)
- Has a dismiss/close button

**CRITICAL — No flash:** The feature gate popup should appear INSTANTLY if a user doesn't have access. There must be NO moment where the feature content loads first and then gets replaced by the gate. Implementation: check subscription tier BEFORE rendering content, not after.

**Feature gate is a MODAL/POPUP, not a page replacement.** Content behind it should be blurred, not removed.

---

## 6. HOME PAGE LAYOUT (LOCKED)

> realsight.app — same page for logged-in and logged-out. Only difference: logged-out shows top nav (Sign In + Start Free). Logged-in shows sidebar.

**Top to bottom:**

1. **Search bar with filters** (all free, no login needed)
   - Location text field (autocomplete areas/projects/developers)
   - Beds dropdown: Any, Studio, 1, 2, 3, 4, 5+
   - Sales / Rental toggle
   - Status dropdown: Any, Ready, Off-Plan
   - Type dropdown: Any, Apartment, Villa, Townhouse, Penthouse
   - Search button

2. **Scrollable area pills** — top areas by volume with transaction count, free

3. **Time period tabs** — YTD, 7D, 1M, 3M, 6M, 1Y — free

4. **5 KPI cards** — all free and public:
   - Median Price (with YoY % change arrow)
   - Price / sqft (with YoY % change arrow)
   - Transactions (30-day count)
   - Rental Yield (gross avg)
   - Market Score 0–10 (RealSight unique — with label: Strong Buy / Bullish / Neutral / Cautious)

5. **"Analyse My Property" green button** — links to Deal Analyzer (or login if public)

6. **Two charts** (free, visible to all — our DXBinteract differentiator):
   - Left: 12-month price per sqft trend (area chart, green line)
   - Right: 30-day transaction volume by area (bar chart)

7. **Area Performance table** (free, visible to all):
   - Columns: Area | Price/sqft | YoY Growth | Rental Yield | 30d Volume | Demand | Market Position badge
   - Market Position badge: "X% Below/Above Market" — RealSight unique
   - Demand label: Very High / High / Moderate / Low
   - Click row → goes to /market-intelligence?area=xxx (requires login if not logged in)

8. **RealSight unique features showcase** — 4 cards:
   - Deal Analyzer, Market Score, AI Investor Presentation, Portfolio Intelligence

9. **Sign-up CTA** (public only): "Ready to invest smarter? Start Free"

10. **Logged-in only sections** (below, conditional):
    - Overdue payment alert (only if user has overdue)
    - Portfolio overview (only if totalInvested > 0)

---

## 7. SIDEBAR NAVIGATION

Collapsed: 64px icons only + hover tooltips
Expanded: 240px with labels, triggered by hover or pin click (pin state saved in localStorage)
No theme toggle — dark mode only.

| Icon | Label | Route | Min Plan |
|------|-------|-------|----------|
| 🏠 | Home / Market | /dashboard | Free |
| 📊 | Portfolio | /portfolio | Explorer (free) |
| 💳 | Payments | /payments | Explorer (free) |
| 📁 | Documents | /documents | Explorer (free) |
| 📈 | Market Intelligence | /market-intelligence | Portfolio Pro |
| 🗺️ | Dubai Heatmap | /heatmap | Portfolio Pro |
| 🔍 | Deal Analyzer | /deal-analyzer | Portfolio Pro |
| 👁️ | Watchlist | /watchlist | Portfolio Pro |
| ⚖️ | Compare | /compare | Portfolio Pro |
| ⭐ | Top Picks | /top-picks | Adviser Starter |
| 🌍 | Global Radar | /radar | Adviser Starter |
| 🎯 | Opportunity Signals | /opportunity-signals | Adviser Starter |
| 🏗️ | New Launches | /projects | Free (units locked at Portfolio Pro) |
| 🤖 | AI Concierge | /concierge | Explorer limited / Adviser unlimited |
| 👤 | Account | /account | Any logged in |

---

## 8. NEW LAUNCHES (NAMING)

- Always called "New Launches" in the UI — NEVER "Reelly" or "Off-Plan Hub"
- The underlying Reelly API is internal only, never exposed in any UI text
- Free: Browse listing (name, developer, location, area, price range)
- Portfolio Pro: Unlock unit availability (which units available, sizes, floor, exact price)
- Adviser Starter: Share project links with clients
- Adviser Pro: Generate AI Investor Presentation from project

---

## 9. DEAL ANALYZER PDF REPORTS

Two separate PDFs, both downloadable from Deal Analyzer page:

**PDF 1 — Deal Analysis Report** (Portfolio Pro+)
- 7 pages
- Cover: property hero, name, stats, agent branding
- Property Overview + photos
- Location + drive times + amenities
- Dubai Market Snapshot + price benchmarks
- Comparable sales table
- Investment Metrics + Yield Scenarios
- AI Investment Verdict (Strengths/Weaknesses, Overall Assessment, Recommended Strategy)
- Agent card + Next Steps + Disclaimer
- Branding: Adviser details if adviser plan, RealSight branding if investor plan

**PDF 2 — AI Investor Presentation** (Adviser Pro only)
- 8 slides
- Cover with AI verdict badge (STRONG BUY / BUY / CONDITIONAL BUY / HOLD / AVOID)
- Market Snapshot
- Price Analysis + Benchmarks
- Investment Metrics + Yield Scenarios
- AI Verdict (full page)
- AI Advice + Next Steps
- Agent card + Disclaimer

---

## 10. DEAL ANALYZER — ENTRY MODES

**Mode 1: Paste URL**
- User pastes Bayut / Property Finder / Dubizzle link
- System detects platform, shows badge
- Switches to form mode for data entry (we cannot scrape external sites)

**Mode 2: Form + DLD Search**
- Property/Development name text field
- Area — autocomplete from dld_areas table (shows "Matched to DLD data: [Area]" in green when matched)
- Property Type dropdown
- Bedrooms dropdown
- Floor/Level text field
- Asking Price (AED)
- Size (sqft)
- Expected Annual Rent (optional)
- Service Charge (optional)

---

## 11. FEATURE GATE POPUP SPEC

When user hits locked content:
- **Do NOT load content first then replace** — check tier before rendering
- Show a centred modal with blurred background
- Lock icon (large, coloured circle)
- Headline: "[Plan Name] Feature"
- Subline: "Unlock this with the [Plan Name] plan."
- Current plan: "Your plan: Explorer (Free)"
- "Also included with [Plan Name]:" — 2-column icon grid (4–6 items)
- CTA: "Upgrade — $29/mo →" (or $99, $199 depending on required plan)
- The CTA links directly to /payments?plan=portfolio_pro

---

## 12. AI FEATURES

| Feature | Provider | Where used |
|---------|----------|-----------|
| Deal Analyzer verdict | Gemini API (gemini-proxy Edge Function) | /deal-analyzer |
| AI Investor Presentation content | Gemini | PDF generation |
| AI Concierge | Gemini | /concierge |
| Market Score | Computed (no AI, DLD formula) | Home + Market Intelligence |

---

## 13. REMAINING DEVELOPMENT SPRINTS (post-Monday launch)

1. **Map polygon upgrade** — area boundary polygons on the Dubai Heatmap
2. **History page** — DLD transaction history per area (individual transaction rows like DXBinteract)
3. **WhatsApp sharing** — direct wa.me link for sharing PDF reports (no WATI API needed)
4. **Mobile app** — Capacitor wrapping the web app for iOS/Android (App Store review: 3–7 days minimum)

---

## 14. TECHNICAL ARCHITECTURE

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions / Deno)
- **Data fetching:** TanStack Query v5
- **Charts:** Recharts
- **Maps:** React Leaflet
- **Animations:** Framer Motion
- **PDF generation:** @react-pdf/renderer (client-side, browser)
- **AI:** Gemini via gemini-proxy Supabase Edge Function
- **Payments:** Stripe Checkout Sessions + Webhooks
- **Deployment:** Vercel (auto-deploy via `npx vercel --prod`)
- **Dark mode only** — no theme toggle anywhere

---

## 15. KEY BUGS TO FIX BEFORE LAUNCH

1. **Feature gate flash** — Market Intelligence and other gated pages briefly show content before the gate. Fix: check subscription BEFORE rendering, not after.
2. **Home page search (public)** — search currently requires login. It must work without login — the entire home page including search is public.
3. **Home page glass cards** — KPI cards need Apple-style glassmorphism (backdrop-blur, subtle border, translucent background).
4. **Price trend chart** — shows "Invalid Data" when marketSeries table is empty. Fix: always use the areas-based fallback calculation.
