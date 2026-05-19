# RealSight — Apple App Store Launch Playbook

Comprehensive readiness audit + step-by-step launch playbook for
publishing RealSight to the App Store. Treat this as the senior-mobile-
lead handover doc. Follow it top-to-bottom; nothing gets discovered
during Apple review that we haven't already addressed.

Last updated: 19 May 2026 · Target: First TestFlight build → public
launch within 2-3 weeks of starting.

---

## 0. What you actually need to do (the human bits)

You can't skip these. Start them today; they have lead times.

| # | Item | Where | Cost | Lead time |
|---|---|---|---|---|
| 1 | **D-U-N-S Number for ADRO LAB Inc.** | https://www.dnb.com/duns-number.html | Free | **5–10 business days** |
| 2 | **Apple Developer Program (organization)** | https://developer.apple.com/programs/enroll/ | $99/year | 1–3 days after D-U-N-S |
| 3 | **App Store Small Business Program** | https://developer.apple.com/app-store/small-business-program/ | Free | ~1 day after Apple Dev enrolment |
| 4 | **App Store Connect account verification** | Auto on Apple Dev signup | — | Same day |
| 5 | **Banking + tax forms** | App Store Connect → Agreements | Free | 1–2 days |

**Order of operations:** start D-U-N-S TODAY. Everything else cascades
from it. Without a D-U-N-S you cannot enrol Apple Developer as a
business.

---

## 1. Readiness audit — App Store Review Guidelines

Apple's review team checks these items on every submission. Failures
are auto-rejection. We address each below.

### 1.1 In-App Purchase for digital goods — **REQUIRED**
- Apple requires all paid subscriptions sold inside iOS apps to use
  Apple's IAP (StoreKit) — Stripe is forbidden for digital goods.
- **Status:** PR 7 (RevenueCat) handles this. Until PR 7, the iOS app
  must hide the Stripe upgrade flow.
- Map: Investor Pro + Adviser Pro → StoreKit auto-renewable subscriptions.
- Subscription disclosures (price, period, renewal terms) shown
  BEFORE the IAP sheet — RevenueCat templates handle this.

### 1.2 Sign in with Apple — **REQUIRED** (we offer Google OAuth)
Apple Guideline 4.8: any app offering 3rd-party sign-in (Google,
Facebook, etc.) MUST also offer Sign in with Apple, given equal
prominence.

- **Status:** TODO. Add SIWA as a Supabase Auth provider, surface a
  "Sign in with Apple" button alongside the existing Google button.
- Supabase docs: https://supabase.com/docs/guides/auth/social-login/auth-apple

### 1.3 Account deletion in-app — **REQUIRED**
Apple Guideline 5.1.1(v): apps with accounts must allow account
deletion from within the app (not just disable / contact-us).

- **Status:** TODO. Add "Delete account" button to `/account` calling
  the existing `delete-user` edge function with two-step confirmation.

### 1.4 App Privacy nutrition labels — **REQUIRED**
Declare every type of data the app collects in App Store Connect.

- **Status:** Draft below; will be entered into App Store Connect
  during submission.
- Categories to declare for RealSight:
  - **Identifiers:** User ID (Supabase auth)
  - **Usage Data:** Product Interaction (analytics if any)
  - **Contact Info:** Email Address (account), Phone (optional)
  - **User Content:** None (we don't accept photo uploads etc.)
  - **Financial Info:** Payment Info (handled by Apple IAP — we don't see card)
  - **Diagnostics:** Crash Data (if we add a crash reporter)
- Mark all data as "Used to track" = **No** (we don't fingerprint).
- Sharing with third parties = **No** (except Supabase as processor).

### 1.5 Permission usage strings — **REQUIRED if any access**
For RealSight we don't currently need camera, photos, contacts, etc.
Verify no plugin pulls these in. Add usage strings if any do later.

### 1.6 Encryption export compliance — **REQUIRED**
- Add to Info.plist:
  ```xml
  <key>ITSAppUsesNonExemptEncryption</key>
  <false/>
  ```
- We use only HTTPS / standard auth — qualifies as exempt.

### 1.7 App Transport Security (ATS) — **REQUIRED**
- All network requests over HTTPS. ✅ Already the case (Supabase, FRED,
  Companies House, etc. are all HTTPS).
- No NSAllowsArbitraryLoads exceptions.

### 1.8 64-bit only — **REQUIRED**
- Current Info.plist has `<string>armv7</string>` in UIRequiredDeviceCapabilities.
  This is **wrong** for modern iOS (32-bit support was dropped in iOS 11).
- **Fix:** change to `arm64`. Already covered in §3 below.

### 1.9 Universal Links — **STRONGLY RECOMMENDED**
- Use Apple-Associated Domains so realsight.app links open in the
  native app when installed.
- Configure: add `apple-app-site-association` JSON at the realsight.app
  root + add Associated Domains entitlement.
- **Status:** TODO (Phase 6.5; not blocking initial launch).

### 1.10 App icon — **REQUIRED**
- Master icon at 1024×1024, no transparency, no rounded corners
  (Apple applies the mask).
- Generate all sizes (Xcode does it automatically from a 1024 master:
  Assets.xcassets/AppIcon.appiconset).

### 1.11 Launch screen — **REQUIRED**
- LaunchScreen.storyboard exists ✓ (verified in Info.plist).
- No static splash images (Apple rejects those since iOS 14).

### 1.12 iPad layout — **REQUIRED if not iPhone-only**
- Current Info.plist supports iPad orientations. Choose:
  - **Path A:** mark app iPhone-only (set TARGETED_DEVICE_FAMILY to 1
    in Xcode). Saves work.
  - **Path B:** support iPad properly. Test all routes on iPad
    simulator at 12.9" + 11" + mini.
- **Recommendation:** iPhone-only for v1 launch. iPad support is a
  v1.1 milestone. (Apple does NOT require iPad if you mark it
  iPhone-only.)

### 1.13 Light + dark mode — **RECOMMENDED**
- App is currently dark-only (cinematic-bg). Apple accepts dark-only.
  No action needed — but document for review notes: "App is designed
  for dark interfaces consistent with the investor data-density UX."

### 1.14 No web links to subscriptions — **REQUIRED**
- In-app, do not link to a webpage that lets users buy a subscription
  outside Apple's IAP (Reader rule exception doesn't apply to us).
- **Anti-pattern to avoid:** "Manage subscription on realsight.app/billing"
  button inside iOS app. Use the App Store's Manage Subscriptions
  screen instead via `SKStoreReviewController.requestReview()` (or
  RevenueCat helper).

### 1.15 No "scam" patterns — **REQUIRED**
- Trial pricing must be clear. RevenueCat handles this.
- No dark patterns around cancellation.
- Subscription cancellation = available via Apple's Settings → no
  in-app friction.

---

## 2. App Store Connect metadata you'll need

Prepare these BEFORE clicking "Submit for Review":

### Localized text (English required; others optional)
- **App name** (30 char max): `RealSight: Property Intelligence`
- **Subtitle** (30 char max): `Live US, UK & UAE markets`
- **Description** (4000 char max): see template below.
- **Keywords** (100 char max, comma-separated): see template below.
- **Promotional text** (170 char max, can be changed without review):
  see template.
- **What's new** (4000 char max — per-release notes).

### URLs
- **Support URL:** `https://realsight.app/security` or a dedicated
  support page.
- **Marketing URL:** `https://realsight.app/`
- **Privacy Policy URL:** `https://realsight.app/privacy` ✓

### Categories
- **Primary:** Finance
- **Secondary:** Business

### Screenshots (required sizes)
| Device | Size | Required |
|---|---|---|
| iPhone 6.9" (16 Pro Max) | 1320×2868 | ✅ |
| iPhone 6.5" (XS Max, 14 Plus) | 1242×2688 | ✅ |
| iPhone 5.5" (8 Plus) | 1242×2208 | If supporting iPhone 8 era — optional now |
| iPad 13" | 2064×2752 | Required only if iPad-supported |

We need 3-10 screenshots per device size. Capture from a real device
or Xcode simulator at the right resolution.

### App preview video (optional but recommended)
- 15-30 sec, captured at one of the device sizes above.

### Age rating
- IARC questionnaire → expected: **4+** (no objectionable content).

---

## 3. Code/config changes needed before submission

These are concrete diffs we'll ship as the iOS PR alongside RevenueCat.

### 3.1 Info.plist — fix + additions

```xml
<!-- REPLACE armv7 with arm64 -->
<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>arm64</string>
</array>

<!-- ADD encryption compliance -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<!-- ADD supported languages — drives App Store localised listings -->
<key>CFBundleLocalizations</key>
<array>
    <string>en</string>
    <string>ar</string>
    <string>es</string>
    <string>fr</string>
    <string>fa</string>
    <string>ru</string>
</array>
```

### 3.2 Account deletion in `/account`
- New section "Danger zone" → "Delete my account permanently".
- Two-step confirmation modal (type "DELETE" to confirm).
- Calls `supabase.functions.invoke('delete-user')`.

### 3.3 Sign in with Apple
- Enable in Supabase Auth provider settings.
- Add "Sign in with Apple" button to `Login.tsx` ABOVE the Google
  button (Apple requires equal-or-greater prominence).

### 3.4 RevenueCat integration (PR 7)
- See `docs/PRICING_AND_COMMISSIONS.md` for product configuration.
- Hide the Stripe `/billing` upgrade flow on Capacitor iOS — route to
  RevenueCat purchase sheet instead.

---

## 4. Submission walkthrough (when ready)

1. **Open Xcode**, ensure scheme is set to "Any iOS Device (arm64)".
2. **Increment version:** Marketing Version (1.0.0) + Build (1, 2, 3…).
3. **Archive:** Product → Archive. Wait for build.
4. **Organizer opens** → click "Distribute App" → "App Store Connect" → "Upload".
5. **Validate** (Apple runs basic checks) → resolve any issues → Upload.
6. **App Store Connect** → My Apps → RealSight → TestFlight tab. Build
   appears in 5–20 min.
7. **Internal testing:** add team emails, install via TestFlight app
   on real devices, smoke-test every flow.
8. **External testing (optional):** add up to 10,000 beta testers, run
   for ≥3 days.
9. **App Store tab** → Prepare for Submission → fill in metadata,
   screenshots, App Privacy, age rating.
10. **Submit for Review.** Apple reviews in 24–48h typically.
11. **Approved → "Release manually"** so we control the public launch
    moment.

---

## 5. Common rejection causes (and how we avoid them)

| Rejection reason | Our prevention |
|---|---|
| 3.1.1 — Payments outside IAP | RevenueCat handles all iOS payments. Web stays Stripe. |
| 4.8 — Sign in with Apple missing | We're adding SIWA in PR 7. |
| 5.1.1(v) — No account deletion | We're adding it in PR 7. |
| 2.5.1 — Web view that's just realsight.app | We ship a native shell + IAP + native features. |
| 2.1 — Broken functionality | TestFlight all 30+ routes before submit. |
| 2.3.7 — Inappropriate App Store metadata | Description below uses clean copy. |
| 5.1.1 — Privacy policy mismatch | Match the App Privacy nutrition labels to /privacy. |

---

## 6. App Store listing copy (draft)

### App Name (30/30)
```
RealSight: Property Intel
```

### Subtitle (28/30)
```
Live US, UK & UAE markets
```

### Promotional Text (157/170)
```
Property intelligence backed by FHFA, HM Land Registry, and the Dubai
Land Department. AI verdicts on every market. Built for serious investors.
```

### Description (1900/4000)
```
RealSight is a global property intelligence platform built on official
government registries. Track and analyse residential markets across
the US, UK, and UAE in one place, with live data from FHFA, HM Land
Registry, the Dubai Land Department, and partner inventory feeds.

LIVE MARKETS
- United States: 20 Case-Shiller metros + per-transaction sales data
  for NYC, LA, and Chicago.
- United Kingdom: HM Land Registry's UK House Price Index across 13
  regions and Britain's major cities — 24 million transactions of
  history.
- United Arab Emirates: live Dubai Land Department data + 1,800+
  off-plan projects.

OFF-PLAN INVENTORY
Discover new launches across Dubai, Bali, and Phuket — the world's
three most active off-plan markets for international investors.

DESIGNED FOR REAL DECISIONS
- AI verdicts on every market and project.
- Portfolio tracking across multiple countries and currencies.
- Deal Analyzer scores any property against live comps.
- Concierge: an AI assistant that knows your portfolio.

GOVERNMENT REGISTRIES, NOT GUESSWORK
All headline numbers trace back to government sources or licensed
partner data. No scraped listings. No fabricated comps. Every figure
is auditable.

PRIVACY FIRST
Independent software company. We do not employ real estate agents
and never share your portfolio with brokers. Built by ADRO LAB Inc.,
Delaware.

SUBSCRIPTION DETAILS
RealSight offers Investor Pro and Adviser Pro subscriptions. Free plan
available with limited markets. Subscriptions auto-renew unless
cancelled at least 24 hours before the period ends. Manage or cancel
anytime in Settings.

Terms: https://realsight.app/terms
Privacy: https://realsight.app/privacy
```

### Keywords (95/100)
```
property,real estate,investment,dubai,london,nyc,off plan,land registry,fhfa,dld,investor
```

---

## 7. Post-launch operations

- **Crash reporting:** add Sentry or RevenueCat's built-in attribution.
- **App Store Connect API** for automated review status notifications
  (optional).
- **Apple Search Ads** for paid discovery (optional, after first month
  of data).
- **Promotional Codes** issued via App Store Connect for press / VIPs.
- **A/B testing** subscription prices via RevenueCat Experiments (post-launch).
