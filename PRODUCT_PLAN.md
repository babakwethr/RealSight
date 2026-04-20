# RealSight — Agreed Product Plan
> This file is the source of truth. Never deviate from this without explicit user approval.

---

## HOME PAGE — CRITICAL ARCHITECTURE DECISIONS
> These were explicitly agreed and must never be changed without explicit approval.

### BYPASS LANDING PAGE:
- `/` NEVER shows a marketing page. The product IS the pitch.
- Logged-out visitors see real DLD market data immediately (like DXBinteract)
- Logged-out view has a top nav: RealSight logo (left) + "Sign In" + "Start Free — It's Free" (right)
- Logged-in users see the same page with the sidebar instead of top nav
- Feature gate popups appear when they try locked features (this is how we convert)

### THE HOME = MARKET DATA PAGE (DXBinteract-style):
The home page IS the market intelligence / transactions page. NOT a portfolio dashboard.

### Layout Order (top to bottom):

1. **Large Centered Search Bar** — Autocomplete across areas, projects, developers. Placeholder: "Search any area, project, or developer in Dubai"

2. **Scrollable Area Pills** — Horizontal scroll of top areas by volume (e.g. JVC, Business Bay, Downtown Dubai...) — clicking filters the table below

3. **Time Period Tabs** — YTD | 7D | 1M | 3M | 6M | 1Y — filters the data shown

4. **5 KPI Cards** — Median Price / Price per sqft / Transactions / Rental Yield / Market Score (0-10)
   - Market Score is RealSight's unique addition, DXBinteract doesn't have it

5. **Two Charts (trading-app style — NOT in DXBinteract):**
   - Left: 12-month Price per sqft trend (area chart, green line)
   - Right: 30-day Transaction Volume by area (bar chart)

6. **Area Performance Table (DXBinteract-style rows):**
   Columns: Area | Price/sqft | YoY% | Rental Yield | 30d Volume | Demand Score | Market Position badge
   - **Market Position badge** = "7% Below Market" / "At Market" / "12% Above Market" — RealSight unique, DXBinteract doesn't have it
   - **Demand Score** = 0-100 showing how actively area is trading — RealSight unique
   - Row actions: Details button → goes to /market-intelligence?area=xxx

7. **"Analyse My Property" CTA** — green button section, promotes Portfolio plan. Links to Deal Analyzer.

8. **Deal Analyzer quick entry** — paste a link or search DLD database

9. **Overdue payment alert** (logged-in only) — only if user has overdue payments

10. **Portfolio overview** (logged-in only) — ONLY if user has totalInvested > 0

---

## FEATURES NOT IN DXBINTERACT (our differentiators):
1. Deal Analyzer with downloadable PDF report (Investment Analysis + AI Investor Presentation)
2. Trading-style charts on home (price trend, yield bar chart, volume chart)
3. Market Score (0–10 composite score)
4. Portfolio Management (track owned properties, payments, documents)
5. AI Concierge (natural language Q&A)
6. Opportunity Signals (AI-detected undervalued areas)
7. AI-generated Investor Presentations (Adviser Pro)
8. Feature gate popups with value stacking

---

## SUBSCRIPTION TIERS (5-tier model):
- **free** = Explorer — portfolio, deal analyzer (screen only, no PDF), AI concierge limited
- **portfolio_pro** ($29/mo) = Deal Analyzer, Market Intelligence, Heatmap, Watchlist, Compare, New Launches units
- **adviser_starter** ($99/mo) = Top Picks, Opportunity Signals, Global Radar, AI Concierge Unlimited, New Launches sharing
- **adviser_pro** ($199/mo) = AI Investor Presentation PDF, AI Market Analysis Reports
- **adviser_trial** = same rank as adviser_pro, temporary

---

## DEAL ANALYZER — Agreed Features:
- Two entry modes: (1) Paste listing URL, (2) Form with DLD autocomplete search
- DLD autocomplete: as user types area/building, matches against dld_areas table
- Outputs: Market Verdict, Area comparison, Yield scenarios, AI Verdict (Gemini)
- Two PDF downloads:
  - "Deal Report PDF" (Portfolio Pro+) — 7-page Investment Analysis Report
  - "AI Investor Presentation PDF" (Adviser Pro only) — 8-slide branded deck
- Adviser branding: if logged in as adviser, adviser name/phone/email on PDFs. If investor, RealSight branding.
- Property photos: pulled from listing URL if technically possible

---

## PDF REPORTS — Brand Design System:
- Colors: Dark navy (#0F1C2E), Gold (#C9A84C), White, Gray scale
- Both reports share identical design system (pdfStyles.ts)
- Both have consistent header/footer with RealSight branding
- Professional charts (bar charts, KPI cards, data tables) in every report

---

## SIDEBAR — Icon Rail:
- Collapsed to w-16 (icons only + tooltips)
- Expands to w-60 on hover or pin (localStorage persisted)
- No theme toggle anywhere in app (single dark mode only)
- New Launches in nav (free for all)

---

## STRIPE BILLING — Live:
- Plans: portfolio_pro ($29), adviser_starter ($99), adviser_pro ($199)
- Edge Functions: create-checkout-session, stripe-webhook
- Webhook events: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted, invoice.payment_failed
- Plan stored in: user_metadata.plan AND tenants.subscription_tier

---

## PUBLIC LANDING PAGE (realsight.app):
- 4-column pricing grid: Explorer (Free), Portfolio Pro ($29), Adviser Starter ($99, highlighted), Adviser Pro ($199)
- Visitor sees marketing page. After login → /dashboard

---

## REMAINING SPRINTS:
- [ ] Map polygon upgrade (area boundaries on heatmap)
- [ ] History page (DLD transaction history per area)
- [ ] Mobile app — Capacitor wrapping web app (post web launch, store review 3-7 days)
- [ ] WhatsApp sharing for reports (no WATI, direct wa.me link)
