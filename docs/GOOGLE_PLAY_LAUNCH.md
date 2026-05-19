# RealSight — Google Play Store Launch Playbook

Comprehensive readiness audit + step-by-step launch playbook for
publishing RealSight to Google Play. Since this is Babak's first
Android launch, this is the senior-mobile-lead handover doc — every
required item, every form, every gotcha.

Last updated: 19 May 2026 · Target: First internal-testing AAB →
public launch within 2-3 weeks.

---

## 0. What you actually need to do (the human bits)

| # | Item | Where | Cost | Lead time |
|---|---|---|---|---|
| 1 | **Google Play Developer account (organization)** | https://play.google.com/console/u/0/signup | $25 one-time | 1–7 days (identity verification) |
| 2 | **Identity verification** | Play Console after signup | Free | Same as #1 |
| 3 | **D-U-N-S Number** (optional, but speeds verification) | https://www.dnb.com/duns-number.html | Free | Already in progress for Apple |
| 4 | **Bank account + tax forms** | Play Console → Setup → Payments | Free | 1–2 days |

**Difference from Apple:** Google verifies your identity (real name +
business documents) but doesn't require D-U-N-S. The $25 fee is one-
time and your account is permanent.

---

## 1. Readiness audit — Google Play policies

### 1.1 Target SDK 34+ — **REQUIRED**
- As of Aug 2024, all new apps must target Android 14 (API 34) or higher.
- **Check:** `android/app/build.gradle` → `targetSdkVersion`.
- Capacitor 7+ defaults to 34. Verify.

### 1.2 64-bit code — **REQUIRED**
- All native libraries must be 64-bit (arm64-v8a). Capacitor + Vite
  produce a pure WebView shell, so this is already satisfied.
- AAB enforces this automatically.

### 1.3 App Bundle (.aab) — **REQUIRED**
- New apps cannot ship as .apk; .aab is mandatory since Aug 2021.
- Capacitor's `./gradlew bundleRelease` produces a signed .aab.

### 1.4 Play App Signing — **REQUIRED**
- Google holds the upload signing key; we hold a separate upload key.
- This means if we ever lose our key, Google can re-sign.
- Enrol during the first app creation in Play Console.

### 1.5 In-App Purchase via Google Play Billing — **REQUIRED**
- Same as Apple: digital subscriptions inside the app MUST use Play
  Billing. Stripe is not allowed inside Android for digital goods.
- **Status:** PR 7 (RevenueCat) handles this — same plugin as iOS.

### 1.6 Account deletion in-app — **REQUIRED**
- Google requires the same flow as Apple (in-app account deletion,
  not just disable). Same code change covers both stores.

### 1.7 Data Safety form — **REQUIRED**
This is Google's equivalent of Apple's App Privacy nutrition labels.
You declare in Play Console which data is collected, why, and whether
it's shared.

**RealSight Data Safety declaration:**
- **Personal info collected:**
  - Email (for account)
  - Name (for account; optional for investors)
  - Phone number (optional, for investor onboarding)
- **Financial info:** payment info — handled by Google Play Billing,
  not collected by us directly.
- **App activity:** product interactions (analytics if any).
- **App info & performance:** crash logs if a reporter is added.
- **Device or other IDs:** none currently.
- **Data sharing:** with Supabase (data processor — disclose).
  No advertising partners. No sale of personal data.
- **Encryption in transit:** Yes (HTTPS only).
- **User can request data deletion:** Yes (in-app, /account).

### 1.8 Content rating (IARC questionnaire) — **REQUIRED**
- Expected outcome: **PEGI 3 / ESRB Everyone / IARC 3+**.
- No violence, no gambling, no adult content. Submit the
  questionnaire honestly — finance category.

### 1.9 Target audience and content — **REQUIRED**
- Set to **18+** (adult investors).
- Declare app DOES NOT target children.
- Disables ad networks intended for kids.

### 1.10 Ads declaration — **REQUIRED**
- We do not show ads. Declare "No ads" in the listing.

### 1.11 Permissions justification — **REQUIRED**
Each dangerous permission needs a stated reason in the listing
(visible to users).

Current AndroidManifest.xml has:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

INTERNET is a normal permission and needs no justification. Good
baseline. If we ever add CAMERA, LOCATION, etc., we must justify
each one.

### 1.12 Pre-launch report — **AUTOMATIC**
- Google runs your AAB on real devices (multiple Android versions)
  and flags crashes, accessibility, performance, and security issues.
- Available 2-4 hours after uploading the first AAB to any testing track.
- **Action:** review and fix every flag BEFORE moving to production.

### 1.13 Privacy Policy URL — **REQUIRED**
- Must be public, dedicated page (not a section). ✓ We have
  `https://realsight.app/privacy`.

### 1.14 Contact details — **REQUIRED**
- Email address (mandatory).
- Phone (optional).
- Website (optional but recommended).

### 1.15 Listing assets — **REQUIRED**

| Asset | Size | Required | Notes |
|---|---|---|---|
| App icon | 512×512 PNG | ✅ | No alpha; Google applies the shape mask |
| Feature graphic | 1024×500 PNG/JPG | ✅ | Hero banner on the listing |
| Phone screenshots | 1080×1920+ | ✅ Min 2, max 8 | Portrait or landscape |
| 7" tablet screenshots | 1024×600+ | ⚠️ Required if tablet supported | Skip if phone-only |
| 10" tablet screenshots | 1280×800+ | ⚠️ Same as above | Skip if phone-only |
| Promo video | YouTube URL | Optional | Drives install rate |

### 1.16 Short + full description — **REQUIRED**
- **Short description**: 80 chars max. First thing users see in search.
- **Full description**: 4000 chars max. Full feature breakdown.
See §6 below for drafts.

### 1.17 Categories
- **Primary:** Finance
- **Tags:** "Property investing", "Real estate analytics", "Market data"

---

## 2. Code/config changes needed

### 2.1 `android/app/build.gradle` — verify SDK levels
```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "app.realsight.invest"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

### 2.2 Signing config — set up upload key

Generate the upload key (once, store it securely):

```bash
keytool -genkey -v \
  -keystore android/realsight-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias realsight-upload
```

Add to `android/app/build.gradle`:

```gradle
android {
  signingConfigs {
    release {
      storeFile file('../realsight-upload.jks')
      storePassword System.getenv("UPLOAD_STORE_PASSWORD")
      keyAlias 'realsight-upload'
      keyPassword System.getenv("UPLOAD_KEY_PASSWORD")
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
```

Store the passwords in `~/.zshenv` (not committed):
```bash
export UPLOAD_STORE_PASSWORD="<your-password>"
export UPLOAD_KEY_PASSWORD="<your-password>"
```

### 2.3 `scripts/android-release.sh` (one-command build)
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Build web bundle"
npm run build

echo "→ Sync Capacitor"
npx cap sync android

echo "→ Build signed AAB"
cd android
./gradlew bundleRelease

OUTPUT="app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "✅ AAB built: $(realpath $OUTPUT)"
echo "   Upload to Play Console → RealSight → Production / Internal Testing."
```

Make executable: `chmod +x scripts/android-release.sh`.

### 2.4 Manifest permissions
Current manifest has only INTERNET. That's sufficient for a Capacitor
WebView shell. No additions needed unless we later integrate camera
(photo upload), location (Auto-detect city), etc.

---

## 3. Submission walkthrough

### Step 1 — Create the app in Play Console
1. https://play.google.com/console → **All apps** → **Create app**.
2. App name: `RealSight: Property Intelligence`
3. Default language: `English (US)`
4. App or game: **App**
5. Free or paid: **Free** (subscription monetization, app itself is free)
6. Declarations: confirm Developer Program Policies + US export laws.
7. Click **Create app**.

### Step 2 — App content
Fill in each section in the left sidebar:
- **App access:** "All functionality is available without special access" (unless adviser pages need login — declare login credentials for review).
- **Ads:** No.
- **Content rating:** complete IARC questionnaire → expect **PEGI 3**.
- **Target audience:** 18+ → confirm no child targeting.
- **News apps:** No (we're finance, not news).
- **COVID-19 contact tracing:** No.
- **Data safety:** complete per §1.7 above.
- **Government apps:** No.
- **Financial features:** **Yes — Personal financial management or investing advice.**
- **Health:** No.

### Step 3 — Store listing
- **App name:** RealSight: Property Intelligence
- **Short description (80 char):** *Live property data + AI verdicts across US, UK, and UAE.*
- **Full description:** draft in §6 below.
- **App icon:** 512×512.
- **Feature graphic:** 1024×500.
- **Phone screenshots:** 4-8 captures at 1080×1920.
- **Categories:** Finance.
- **Email + Website + Phone:** ADRO LAB Inc. contact info.

### Step 4 — Pricing & distribution
- **Free.** ✓
- Countries: select all unless restricted (we should be fine globally for now).
- Pricing template (for subscriptions): set up after PR 7 ships the
  RevenueCat-managed Play Billing products.

### Step 5 — Build the AAB
```bash
./scripts/android-release.sh
```
This produces `android/app/build/outputs/bundle/release/app-release.aab`.

### Step 6 — Upload to Internal Testing
1. Play Console → **Testing** → **Internal testing**.
2. Click **Create new release**.
3. Upload `app-release.aab`.
4. Add up to 100 testers (email addresses).
5. **Review release** → **Start rollout**.
6. Testers receive the install URL via email. Install via Play Store.

### Step 7 — Fix the pre-launch report
- Available 2-4 hours after first internal-testing upload.
- Path: Internal Testing → release → Pre-launch report tab.
- Address every crash and accessibility issue.

### Step 8 — Promote through tracks
1. **Internal testing** (max 100, instant) → smoke test.
2. **Closed testing** (max 200 invites at a time, 1-day review).
3. **Open testing** (unlimited beta users, 1-day review).
4. **Production** (all users, 1-3 day review for first submission;
   <24h thereafter).

### Step 9 — Submit for review
- Production → New release → Upload AAB → fill release notes.
- **Review submission** → **Start rollout to Production**.
- Google reviews; status visible in real-time.
- Approved → app goes live (rollout can be staged: 1%, 5%, 20%, 100%).

---

## 4. Common rejection causes

| Rejection reason | Our prevention |
|---|---|
| Payments outside Play Billing | RevenueCat handles all Android payments. Web stays Stripe. |
| Privacy policy missing or inadequate | We have `/privacy`; Data Safety matches it. |
| Account deletion not in-app | PR 7 adds the in-app delete flow. |
| Misleading metadata | Description is grounded in real features. |
| Pre-launch report crashes | Fix every flag before production submission. |
| Target SDK too low | We're on 34. |
| Sensitive permissions without justification | We use INTERNET only. |
| Financial app missing licensing claims | Add disclaimer "RealSight is an information platform; not financial advice." in description. |

---

## 5. Play Store listing copy (draft)

### App name (32/30 — trim 2 chars)
```
RealSight: Property Intel
```

### Short description (78/80)
```
Live property data + AI verdicts across US, UK, and UAE markets.
```

### Full description (~1800/4000)
```
RealSight is a global property intelligence platform built on official
government registries. Track and analyse residential markets across
the US, UK, and UAE in one place, with live data from the Federal
Housing Finance Agency (FHFA), HM Land Registry, the Dubai Land
Department, and partner inventory feeds.

LIVE MARKETS
🇺🇸 United States — 20 Case-Shiller metros + per-transaction sales
data for NYC, LA, and Chicago.
🇬🇧 United Kingdom — UKHPI across 13 regions and Britain's major cities
backed by 24M transactions since 1995.
🇦🇪 United Arab Emirates — live Dubai Land Department data + 1,800+
off-plan projects across the emirate.

OFF-PLAN INVENTORY
Discover new launches across Dubai, Bali, and Phuket — the three most
active off-plan markets for international investors. Filter by
developer, bedrooms, price, and completion quarter.

WHY REALSIGHT
- AI verdicts on every market and project — short, tonal reads of
  what the numbers actually mean.
- Cross-market portfolio tracking with multi-currency conversion.
- Deal Analyzer scores any property against live comps and registry
  data.
- AI Concierge — an assistant that knows your specific portfolio.

GOVERNMENT REGISTRIES, NOT GUESSWORK
All headline numbers trace back to government sources or licensed
partner data. No scraped listings, no fabricated comps, every figure
is auditable.

INDEPENDENT
Built by ADRO LAB Inc., Delaware. We do not employ real estate agents
and never share your portfolio with brokers.

SUBSCRIPTIONS
- Free plan: limited markets, sample data.
- Investor Pro: $499/mo launch price (US$999 regular). Unlock all
  markets, full Deal Analyzer, unlimited Concierge, monthly portfolio
  reports.
- Adviser Pro: $99/mo launch (US$199 regular). All Investor Pro
  features plus client management and white-label.

Auto-renewing subscriptions. Cancel anytime in your Google account
settings. Terms: https://realsight.app/terms · Privacy:
https://realsight.app/privacy

DISCLAIMER
RealSight provides market intelligence and analytics tools.
Information presented in the app is sourced from public registries
and licensed partners but does not constitute financial advice or a
recommendation to buy or sell property. Always do your own due
diligence.
```

---

## 6. Post-launch operations

- **Vitals dashboard:** monitor crash-free rate, ANRs, slow renders.
- **Play Console Inbox:** review responses to user reviews (helpful
  for ratings).
- **Promo codes:** generate via Play Console → Promotions for free
  trial extensions.
- **Staged rollout:** Always start at 5-10% of users for major
  updates. Halt if crash rate spikes.
- **A/B test store listing:** Play Console → Store listing experiments.
