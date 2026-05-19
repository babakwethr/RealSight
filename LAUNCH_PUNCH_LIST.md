# RealSight — Launch punch list

Working tracker for everything Babak flagged on 19 May 2026 that needs
to be fixed / built before public launch. We work through these in order.
**Update the Status column as we go.**

Statuses: `TODO` · `IN PROGRESS` · `DONE`

---

## Group A — UX / navigation issues (the live app today)

### 1. Search bar — areas only, no buildings
- **Where:** Home (`/` and `/dashboard`) — `SearchFilterBar` in `MarketHome.tsx`
- **Problem:** Search only matches DLD areas (Downtown Dubai, JVC, Palm Jumeirah, etc.). Cannot find a specific building like "Burj Vista" or "Marina Gate" inside JVC.
- **Fix:** Extend search to also match building names. Pull from `dld_developers` / project tables, or the Reelly catalogue (1,868 projects with `name` field). Type "JVC towers" → return buildings located in JVC.
- **Files:** `src/pages/MarketHome.tsx`, `src/components/SearchFilterBar` (or wherever the search lives).
- **Status:** PR 3 in flight

### 2. US / UK market pages open without the sidebar
- **Where:** Click "US Market" or "UK Market" in the sidebar OR the pills on home → lands on a barebones page (`/market/us`, `/market/uk`)
- **Problem:** `UsMarketHome.tsx` and `UkMarketHome.tsx` are self-contained pages with their own header. They don't render inside the `AppLayout` chrome, so the sidebar is gone and the look is inconsistent.
- **Fix:** Move both pages inside the `AppLayout`/authenticated route shell. They should look and feel like the UAE Market home — same sidebar, same chrome, just different data.
- **Files:** `src/App.tsx` (routes), `src/pages/UsMarketHome.tsx`, `src/pages/UkMarketHome.tsx`.
- **Status:** TODO (chrome wrapped in AppLayout)

### 3. Off-Plan page also opens without sidebar + needs filters and detailed search
- **Where:** `/off-plan`
- **Problem:** Same chrome issue as #2 — no sidebar. Also: no filter panel, no real search.
- **Fix:** Wrap in `AppLayout`. Add a proper filter panel — country, developer, price range, bedrooms, completion quarter, sale status. Add a search bar that matches project name + developer + district.
- **Files:** `src/pages/OffPlan.tsx`, `src/App.tsx`.
- **Status:** PR 1 done (chrome) + PR 4 in flight (filters / search)

### 4. Hide the project counts (UAE ~1,953 · Bali 66 · Phuket 10)
- **Where:** `/off-plan` hero — the three country cards show big numbers
- **Problem:** Babak doesn't want to publicly advertise catalogue size.
- **Fix:** Remove the `~N projects` line from the country selector cards. Keep just country + flag + label.
- **Files:** `src/pages/OffPlan.tsx`.
- **Status:** PR 2 in flight

### 5. Sidebar nomenclature + global heatmap
Three sub-items:
- **5a. "Markets" label** → should be "UAE Market" (the entry pointing to `/dashboard` which is the Dubai-by-default home).
- **5b. "UAE Heatmap" routing**: clicking it should land in the proper authenticated layout (same fix as #2).
- **5c. Build a global heatmap / globe.** Babak wants a globe view that shows all countries with live data; clicking a country drills into that country's heatmap. He has a **21st.dev reference globe** he'll share — DO NOT pick a globe library before he sends the ref.
- **Files:** `src/components/layout/AppSidebar.tsx` (rename), `src/pages/DubaiHeatmap.tsx` (refactor), NEW `src/pages/GlobalHeatmap.tsx` (the globe page).
- **Status:** 5a → PR 2 done · 5b → PR 1 done · 5c → PR 5 in flight

### 6. Off-Plan menu item in sidebar also opens without sidebar
- **Same issue as #3**, just calling out the sidebar entry-point. Resolved by #3's chrome fix.
- **Status:** TODO (folded into #3)

### 7. All market homes need more depth: searchable areas like UAE
- **Where:** `/market/us`, `/market/uk` (and Spain when it launches)
- **Problem:** Today they show high-level macro / metro tiles. No way for a user to search "Brooklyn 11201" or "SW1A 1AA" the way they can search "JVC" in UAE.
- **Fix:** Add a real search bar on each market home that takes a postcode (UK) or ZIP / borough (US) and returns matching data — sale history, comps, trend, demographics. Mirror the UAE search-with-filters UX.
- **Files:** `src/pages/UkMarketHome.tsx`, `src/pages/UsMarketHome.tsx`.
- **Status:** PR 3 in flight

---

## Group B — iOS native build

### 8. Liquid Glass native iOS tab bar
- **Goal:** Replace the current `MobileNav` web component with the **native iOS Liquid Glass tab bar** (iOS 26+ style, true OS-level glass) when running inside the Capacitor iOS shell.
- **Approach:** Detect Capacitor native iOS at runtime; render a native-feeling tab bar via SwiftUI or via Capacitor plugin that surfaces the native `UITabBarController` with Liquid Glass material.
- **Open question:** Are we OK shipping iOS 26+ only, or do we need a fallback for iOS 17–25?
- **Files:** `src/components/layout/MobileNav.tsx`, `src/lib/capacitor.ts`, plus a new iOS native plugin or SwiftUI host module.
- **Status:** TODO

### 9. iOS in-app purchase
- **Goal:** Replace Stripe checkout on iOS with **Apple In-App Purchase** (RevenueCat or native StoreKit 2). Apple requires this for digital goods.
- **Subscription products to model:** Investor Pro, Adviser Pro.
- **Approach:** RevenueCat is recommended — handles receipt validation, restore purchases, family sharing, and works with our existing Stripe billing as a backup payment rail (web stays Stripe; iOS goes IAP). They have a Capacitor plugin.
- **Files:** Capacitor config, new RevenueCat plugin install, `src/hooks/useSubscription.tsx` (route purchase intent to RevenueCat on iOS).
- **Status:** TODO

### 10. Android — Google Play Store setup
Babak hasn't published an Android app before. Needs hand-holding through:
- **10a.** Register a Google Play developer account ($25 one-time fee at https://play.google.com/console)
- **10b.** Configure Android signing key + Capacitor Android build settings
- **10c.** Generate Play Store listing assets (icons, feature graphic, screenshots, descriptions)
- **10d.** Privacy policy + data safety form
- **10e.** Set up internal / closed / open testing tracks
- **10f.** Submit for review + first release

### 11. Android in-app purchase (Google Play Billing)
- **Goal:** Same as #9 but for Google Play Billing Library (Apple's equivalent).
- **Approach:** RevenueCat handles both stores via one plugin — easiest path if we pick it for iOS.
- **Status:** TODO

---

## Working agreement

- We tackle these **in order**, top to bottom, unless Babak says otherwise.
- Each item gets a PR.
- I update Status column in this file as we move.
- If a fix uncovers a deeper issue, log it as a new numbered item below — do not silently expand scope.
- Babak's 21st.dev globe reference is the unblocker for 5c. Other issues are unblocked.

---

## What's already shipped this session (for context)

- ✅ ADRO LAB Inc. rebrand on footer + legal
- ✅ Public homepage hero: "Live in US · UK · UAE"
- ✅ Multi-market plumbing (`useMarket`, market context)
- ✅ UK launch (HM Land Registry UKHPI + Companies House)
- ✅ US launch (NYC + Chicago + 20 Case-Shiller metros via FRED)
- ✅ /off-plan page with country tabs (UAE/Bali/Phuket)
- ✅ Reelly auth fix (X-API-Key) + country forwarding + response parsing
- ✅ Vercel anon key rotation to JWT
- ✅ Stock empty-state illustration replaced with Lucide icon

The work above shipped end-to-end on `main` and is live on realsight.app.
The punch list above is everything Babak found AFTER that shipped.
