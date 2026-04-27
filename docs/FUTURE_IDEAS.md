# RealSight — Future Ideas Backlog

> **Rule:** anything not in `LAUNCH_PLAN.md` lives here. We do not implement these until after launch. Add liberally — analyze later.

**Status:** Living doc. Started 2026-04-25.

---

## How to use this file

- Any time the user (Babak) shares a new idea that is not on the locked launch plan, log it here under the right section.
- Any time Claude spots an interesting idea while working, log it here.
- Do not start building anything from this file until the launch checklist (§14 in `LAUNCH_PLAN.md`) is done.
- Each entry: **one-line summary**, **why it matters**, **rough effort guess** (S/M/L), **dependencies** if any.

---

## 1. Area Pricing Report PDF — post-launch upgrades

These were considered for v1 but parked to keep launch tight. Already vetted, ready to spec when we revisit.

- **12-month price + rent forecast band** — confidence range overlay on the DPI chart. Beats Property Monitor's backward-only view. *(M, needs forecasting model)*
- **Comparable-buildings auto-pick** — 3 most-similar towers side-by-side (price/sqft, yield, age). *(M, DLD data)*
- **Yield + mortgage scenario** — quick ROI math (cash vs mortgage vs payment plan, 5-year IRR). *(S)*
- **Demand pulse** — days on market, listings velocity, search interest. *(M, needs portal scraping or partnership)*
- **DLD source links on every row** — every transaction row links to its DLD record. Trust play. *(S, depends on DLD API)*
- **60-second voice briefing** — adviser-recorded or AI-generated MP3 the adviser can WhatsApp alongside the PDF. *(M)*
- **Live "always fresh" PDF permalink** — PDF includes a URL that always renders the latest data. *(S)*
- **Risk flags** — supply pipeline, service-charge trend, developer track record. *(M)*

---

## 2. PDF flywheel — extra signup hooks

The 6 core hooks are in `LAUNCH_PLAN.md §16`. Extras parked here:

- **"Updated" stamp with expiry** — *"This snapshot is live for 7 days. Claim the live version free."* Creates urgency. *(S)*
- **Magic-link email body** — when adviser sends PDF via RealSight, the email itself has a "View live + interactive version" button. *(S)*
- **Watermark every chart** with *"Live chart updated daily — realsight.com/jvc"*. *(S)*

---

## 3. Features parked from launch sidebar

These existed in the app but are hidden at launch (§8 in `LAUNCH_PLAN.md`). Bring back as Adviser Pro features or Phase 2.

- **Watchlist** — likely returns as Adviser Pro client-management feature
- **Compare** — multi-property side-by-side
- **Top Picks** — AI curation of opportunities
- **Opportunity Signals** — AI flags off-plan units matching client criteria *(already promised in Adviser Pro spec)*
- **Global Radar** — multi-market scanner
- **Market Pulse** — real-time activity feed
- **Market Index** — RealSight's own price index

---

## 4. New markets (post-launch expansion)

Per §12, the app positions as global with Dubai live. After UAE launch is stable:

- **UK market** — London first, then Manchester
- **Singapore**
- **Spain** — Madrid + Costa del Sol
- **USA** — Miami + NYC

Each market needs: data source, currency display, local taxes, agent network.

---

## 5. Brokerage / agency tier

Currently NOT shipping (per §10). When we revisit:

- Multi-adviser brokerage account
- Shared client pool
- Manager dashboard with team performance
- Bulk billing

---

## 6. Mobile native apps

Capacitor scaffolding exists. Not shipping at launch.

- iOS App Store launch
- Android Play Store launch
- Push notifications (price alerts, new transactions, AI insights)

---

## 7. Other ideas (raw capture — to be sorted)

*(Add new entries here as they come up. Move to the right section above when sorted.)*

- _none yet_

---

## Marketing surface — competitive-moat principle (locked, 25 Apr 2026)

**Founder directive:** public marketing pages must NOT serve as a clone-spec for competitors or their AI agents. Lock this in for every future page we build:

- ✅ Show OUTCOMES, not BLUEPRINTS (what you get vs how it works)
- ✅ Single tasteful "lifestyle" hero shot per page; gradient-mask the bottom
- ❌ No per-feature UI screenshots — hide the workflow library
- ❌ No data-source specifics on public pages (DLD endpoints, refresh cadences, model architecture, integration list)
- ❌ No internal route names, back-office page names, or admin URLs
- ✅ Gate the deeper product reveal behind a trial signup or `/request-access` form so we capture the lead first
- ✅ FAQ should explicitly explain why the page is light on detail — turns the moat into a trust signal ("we keep this private to stay ahead of copy-cats")

When we build new marketing pages (`/for-investors`, `/for-family-offices`, `/security`, market-specific pages, etc.) follow this rule. The current `/for-advisers` page is the reference implementation.

---

## How decisions get made

After launch is stable (~30 days post-public-launch, hitting north-star metrics in §11):

1. Re-read this file end to end
2. Score each idea: **impact × confidence ÷ effort** (RICE-style)
3. Pick top 3 for Phase 2
4. Move them into a new `PHASE_2_PLAN.md`
5. Everything else stays parked
