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
- **Status:** ✅ Done (PR 3)

### 2. US / UK market pages open without the sidebar
- **Where:** Click "US Market" or "UK Market" in the sidebar OR the pills on home → lands on a barebones page (`/market/us`, `/market/uk`)
- **Problem:** `UsMarketHome.tsx` and `UkMarketHome.tsx` are self-contained pages with their own header. They don't render inside the `AppLayout` chrome, so the sidebar is gone and the look is inconsistent.
- **Fix:** Move both pages inside the `AppLayout`/authenticated route shell. They should look and feel like the UAE Market home — same sidebar, same chrome, just different data.
- **Files:** `src/App.tsx` (routes), `src/pages/UsMarketHome.tsx`, `src/pages/UkMarketHome.tsx`.
- **Status:** ✅ Done (PR 1)

### 3. Off-Plan page also opens without sidebar + needs filters and detailed search
- **Where:** `/off-plan`
- **Problem:** Same chrome issue as #2 — no sidebar. Also: no filter panel, no real search.
- **Fix:** Wrap in `AppLayout`. Add a proper filter panel — country, developer, price range, bedrooms, completion quarter, sale status. Add a search bar that matches project name + developer + district.
- **Files:** `src/pages/OffPlan.tsx`, `src/App.tsx`.
- **Status:** ✅ Done (PR 1 chrome + PR 4 filters/search)

### 4. Hide the project counts (UAE ~1,953 · Bali 66 · Phuket 10)
- **Where:** `/off-plan` hero — the three country cards show big numbers
- **Problem:** Babak doesn't want to publicly advertise catalogue size.
- **Fix:** Remove the `~N projects` line from the country selector cards. Keep just country + flag + label.
- **Files:** `src/pages/OffPlan.tsx`.
- **Status:** ✅ Done (PR 2)

### 5. Sidebar nomenclature + global heatmap
Three sub-items:
- **5a. "Markets" label** → should be "UAE Market" (the entry pointing to `/dashboard` which is the Dubai-by-default home).
- **5b. "UAE Heatmap" routing**: clicking it should land in the proper authenticated layout (same fix as #2).
- **5c. Build a global heatmap / globe.** Babak wants a globe view that shows all countries with live data; clicking a country drills into that country's heatmap. He has a **21st.dev reference globe** he'll share — DO NOT pick a globe library before he sends the ref.
- **Files:** `src/components/layout/AppSidebar.tsx` (rename), `src/pages/DubaiHeatmap.tsx` (refactor), NEW `src/pages/GlobalHeatmap.tsx` (the globe page).
- **Status:** ✅ Done (5a PR 2 · 5b PR 1 · 5c PR 5)

### 6. Off-Plan menu item in sidebar also opens without sidebar
- **Same issue as #3**, just calling out the sidebar entry-point. Resolved by #3's chrome fix.
- **Status:** ✅ Done (PR 1, folded into #3)

### 7. All market homes need more depth: searchable areas like UAE
- **Where:** `/market/us`, `/market/uk` (and Spain when it launches)
- **Problem:** Today they show high-level macro / metro tiles. No way for a user to search "Brooklyn 11201" or "SW1A 1AA" the way they can search "JVC" in UAE.
- **Fix:** Add a real search bar on each market home that takes a postcode (UK) or ZIP / borough (US) and returns matching data — sale history, comps, trend, demographics. Mirror the UAE search-with-filters UX.
- **Files:** `src/pages/UkMarketHome.tsx`, `src/pages/UsMarketHome.tsx`.
- **Status:** ✅ Done (PR 3)

---

## Group B — iOS native build

### 8. Liquid Glass native iOS tab bar
- **Goal:** Replace the current `MobileNav` web component with the **native iOS Liquid Glass tab bar** (iOS 26+ style, true OS-level glass) when running inside the Capacitor iOS shell.
- **Approach:** Detect Capacitor native iOS at runtime; render a native-feeling tab bar via SwiftUI or via Capacitor plugin that surfaces the native `UITabBarController` with Liquid Glass material.
- **Open question:** Are we OK shipping iOS 26+ only, or do we need a fallback for iOS 17–25?
- **Files:** `src/components/layout/MobileNav.tsx`, `src/lib/capacitor.ts`, plus a new iOS native plugin or SwiftUI host module.
- **Status:** Code shipped (PR 6). Babak still needs to: (a) add the plugin file to the Xcode target — see `docs/LIQUID_GLASS_TAB_BAR_SETUP.md`, (b) build via Xcode + TestFlight on an iOS 26 device to confirm the real Liquid Glass material renders.

### 9. iOS in-app purchase
- **Goal:** Replace Stripe checkout on iOS with **Apple In-App Purchase** (RevenueCat or native StoreKit 2). Apple requires this for digital goods.
- **Subscription products to model:** Investor Pro, Adviser Pro.
- **Approach:** RevenueCat is recommended — handles receipt validation, restore purchases, family sharing, and works with our existing Stripe billing as a backup payment rail (web stays Stripe; iOS goes IAP). They have a Capacitor plugin.
- **Files:** Capacitor config, new RevenueCat plugin install, `src/hooks/useSubscription.tsx` (route purchase intent to RevenueCat on iOS).
- **Status:** Code shipped (PR 7). Babak still needs: (a) RevenueCat account + paste API keys into Vercel env, (b) create the 4 products in App Store Connect, (c) RevenueCat → Supabase webhook.

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
- **Status:** Code shipped (PR 7 — same plugin as iOS). Needs Babak: products created in Play Console + Android API key into Vercel env.

---

## Group C — App Store / Play Store review compliance (added 29 May 2026)

Cross-checked the public "App Store Approval Checklist" + the latest
2026 Apple/Google rules against our code. Below is only the **real
gaps** — items we already pass are noted at the bottom.

### C1. AI consent + disclosure screen  ❗ hard requirement (Guideline 5.1.2(i), enforced since Nov 2025)
- **What:** First time a user triggers any AI feature (Deal Analyzer,
  Concierge, Deck Builder), show a one-time consent popup that NAMES
  the AI provider (Google Gemini) and says their data is sent there
  for processing. No consent = automatic rejection.
- **Note:** This is the ONE place we are *required* to name the
  vendor (Google/Gemini). Our "no vendor names in UI" rule still holds
  for media-gen tools (Higgsfield etc.) — this AI-processing
  disclosure is the legal exception.
- **Status:** ✅ DONE — `src/components/AiConsentDialog.tsx`, mounted in
  `AppLayout`. One-time modal names Google Gemini, links the policy,
  stores consent in localStorage (`rs_ai_consent_v1`).

### C2. Privacy policy reachable inside the app + AI data clause
- **What:** (a) Add a clickable Privacy Policy link inside the
  authenticated app (Account / Settings) — today it's only on the
  public footer/login. (b) Add a plain-language line to the policy
  stating user data is transmitted to Google Gemini for AI processing.
- **Status:** ✅ DONE — added a "Legal" section to `Account.tsx` with
  Privacy Policy + Terms links. Policy already names Google Gemini
  (sections 2, 3, 5), so the AI clause was already covered.

### C3. iOS Privacy Manifest (PrivacyInfo.xcprivacy)  ❗ mandatory since May 2024
- **What:** Add a privacy manifest for the app + verify every
  Capacitor plugin ships one. Missing one = pre-rejected by bots.
- **Status:** ✅ FILE CREATED — `ios/App/App/PrivacyInfo.xcprivacy`
  (declares collected data types + required-reason APIs).
  **Babak's one Xcode step:** open the iOS project in Xcode, drag this
  file into the `App` group, and tick the **App** target under "Target
  Membership" so it's bundled. Then reconcile the declared data types
  with the App Privacy questionnaire in App Store Connect.

### C4. Remove reviewer-visible "Coming soon"/placeholder bits
- **What:** Apps with placeholder screens get first-pass rejections.
  Audit: Studio "Social Pack — June 2026" tile, "Add a slide — Soon",
  any other teaser/disabled features a reviewer can reach. Either hide
  behind a flag for the reviewed build or make them functional.
- **Status:** ✅ DONE — gated behind `isCapacitorNative()` so the native
  store build hides them, web keeps the full roadmap:
  - Studio: 3 "coming" tool tiles (Social Pack / Video Studio / Buyer
    Matcher) hidden; only working tools show. Header badge + subheading
    adjust too.
  - Deck builder Step 2: 3 not-yet-live templates ("Coming soon") hidden;
    only Cinematic Gold shows. Categories + "Four design styles" copy
    adapt.
  - Deck builder Step 3: "Add a slide — Soon" placeholder hidden.

### C5. No-internet crash test
- **What:** Turn off WiFi + data, open the app, trigger core features.
  Must show a clean "Connection lost" message, not a white screen or
  crash. Add network-error fallbacks where missing.
- **Status:** TODO (verify).

### C6. Build with Xcode 26 / iOS 26 SDK  ❗ mandatory since 28 Apr 2026
- **What:** All new App Store submissions must be built with Xcode 26
  + iOS 26 SDK or they're auto-rejected. (Our minimum *supported* OS
  stays iOS 15 — that's fine; this is about the build SDK.)
- **Status:** TODO — confirm Babak's Xcode is updated before next build.

### C7. Submission-time operational items
- **What:** (a) Pre-made demo/guest login pasted into App Review Notes
  so the reviewer gets past our login wall. (b) A 30-sec unlisted
  screen recording showing the AI feature working (AI calls take a few
  seconds — without this a reviewer may think it's frozen).
- **Status:** TODO (do at submission).

### Already PASS (no work needed)
- ✅ **Delete Account** — real in-app delete (`DeleteAccountSection` in
  `Account.tsx` → `delete-user` edge fn). Compliant.
- ✅ **Secrets not in the app bundle** — AI/DB keys live in Supabase
  edge functions, not the client.
- ✅ **No in-app code execution** — nothing like a terminal/compiler.
- ✅ **Native in-app purchase code** — RevenueCat shipped (items 9/11),
  just needs Babak's account + product config.
- ✅ **Restore Purchases** — handled by RevenueCat.

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
