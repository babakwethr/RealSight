# RealSight — Pricing & Store Commissions (2026)

**Purpose:** Give Babak the data needed to set final prices for
Investor Pro and Adviser Pro across all three channels (web Stripe,
Apple App Store, Google Play) before products are wired into
RevenueCat in PR 7.

Last updated: 19 May 2026.

---

## TL;DR

| Channel | Standard fee | What we qualify for | Effective fee |
|---|---|---|---|
| **Web (Stripe)** | 2.9% + $0.30 | All cards | ~3% on $19/mo |
| **Apple App Store** | 30% y1 / 15% y2+ on subs | **Small Business Program (<$1M/yr)** | **15% flat** |
| **Google Play** | 30% y1 / 15% y2+ on subs | **15% on first $1M/yr** (auto since 2021) | **15% flat** |
| **RevenueCat** | 1% above $2.5K MRR | Free under $2.5K MRR | $0 today |

**Recommendation:** price slightly higher on the app stores than on web
to absorb the 15% gap, OR accept the lower net on mobile in exchange
for simpler UX. **Industry-standard is parity** (same price everywhere
— mobile customers pay the same as web, you eat the 15%).

---

## Current pricing (from `src/lib/pricing.ts`)

| Plan | Regular | Launch promo | Period |
|---|---|---|---|
| **Investor Pro** | $999 | $499 | per month |
| **Adviser Pro** | $199 | $99 | per month |

These are the current values shipping to production. We can change them
any time — both the launch promo logic and the Stripe price IDs need
updating in lockstep with whatever final number Babak picks.

---

## Channel-by-channel breakdown

### 1. Web (Stripe)

| Item | Value |
|---|---|
| Transaction fee | 2.9% + $0.30 (US cards) |
| Subscription fee | Same — no additional Stripe billing fee |
| Tax handling | Stripe Tax = +0.5% if enabled |
| Chargeback fee | $15 per dispute |
| Effective rate at $19/mo | ~3.1% |
| Effective rate at $499/mo | ~3.0% |
| Effective rate at $99/mo | ~3.2% |

Stripe is the cheapest channel by far. Used as the default on
realsight.app for non-Capacitor visitors.

### 2. Apple App Store

Apple takes a cut on every digital-goods transaction in iOS apps.

#### Standard rates (2026)
- **30%** on first-year subscriptions and any non-subscription IAP.
- **15%** on subscription renewals after year 1.

#### Apple Small Business Program (we qualify)
**This is the one to apply for.** If a developer earns <$1M in
proceeds in the prior calendar year (we will), Apple charges a flat
**15%** on ALL subscriptions and IAP — no year-1 jump to 30%.

**Apply at:** https://developer.apple.com/app-store/small-business-program/
Application is fast (~1 business day) and renews annually.

**Important nuance:** if you cross $1M in a calendar year, the rate
jumps to 30% for the rest of that year. You drop back to 15% the
following year if your next 12-month proceeds are <$1M again.

#### EU (DMA)
Since March 2024 the EU's Digital Markets Act lets Apple devs offer
alternative app stores + external payment links. Apple replaces the
commission with a **Core Technology Fee (CTF)** = €0.50 per first
annual install after 1M downloads. For a sub-$1M business this is
usually MORE expensive than just paying the 15-30% — only worth
considering above ~5M annual installs. Default: stay on the standard
flow.

#### What we pay at our prices (assuming Small Business Program)
| Plan | Apple's cut (15%) | Net to RealSight |
|---|---|---|
| Investor Pro $499 launch | $74.85 | $424.15 |
| Investor Pro $999 regular | $149.85 | $849.15 |
| Adviser Pro $99 launch | $14.85 | $84.15 |
| Adviser Pro $199 regular | $29.85 | $169.15 |

### 3. Google Play

Google's pricing is simpler than Apple's since 2021:

- **15%** on first $1M of annual revenue per developer (automatic — no
  application needed).
- **30%** on revenue above $1M (we won't hit this for a while).
- **Subscription renewal rate: 15%** regardless of year (Google dropped
  the year-1 jump in 2022).

#### EU (DMA — user-choice billing)
Alternative billing partners (Stripe, Adyen, etc.) at **11% commission**
to Google + the alt processor's own fee. Net cost is typically
13-14%, so 1-2 points cheaper than Play Billing. Worth considering
for EU traffic specifically, but adds complexity.

#### What we pay at our prices
| Plan | Google's cut (15%) | Net to RealSight |
|---|---|---|
| Investor Pro $499 launch | $74.85 | $424.15 |
| Investor Pro $999 regular | $149.85 | $849.15 |
| Adviser Pro $99 launch | $14.85 | $84.15 |
| Adviser Pro $199 regular | $29.85 | $169.15 |

### 4. RevenueCat (the orchestration layer)

We pick RevenueCat (Babak approved in plan) to manage IAP across both
stores via one Capacitor plugin.

- **Free tier:** up to $2.5K MRR — covers the first ~5 paying users on
  Investor Pro at $499 or ~25 on Adviser Pro at $99.
- **Paid:** 1% of MRR above $2.5K. So at $5K MRR you pay $25/mo.
- **What it gives us:** receipt validation, restore purchases, webhooks
  into Supabase, family sharing, promo codes, A/B testing of price
  points without app updates.

---

## Net comparison at current prices (15% Small Business / Play assumed)

Per single Investor Pro subscriber at $499/mo launch price:

| Channel | Gross | Fees | Net |
|---|---|---|---|
| Web (Stripe) | $499 | $14.77 (2.9% + $0.30) | $484.23 |
| iOS (Apple SBP) | $499 | $74.85 | $424.15 |
| Android (Google) | $499 | $74.85 | $424.15 |

**The mobile gap = $60.08/subscriber/month.**

Three ways to handle it:

1. **Eat it (parity pricing).** Show $499 everywhere. Web subscribers
   are more profitable; mobile is a customer-acquisition channel.
2. **Up-price on mobile.** Show $499 on web, $549 on App Store and
   Google Play. Brings net closer to parity. Both stores allow this.
3. **Encourage web signup.** Display a "manage subscription on the web"
   note in the app. Apple no longer prohibits this (2024 ruling).
   Slight friction for the user but materially better for us.

**Industry default = #1 (parity).** RealSight should ship parity at
launch, watch the data, and reconsider once we have real numbers.

---

## Trial / free-tier guidance

**Apple:** allows free trials of 3 days, 1 week, 2 weeks, 1 month, 2
months, 3 months, 6 months, or 1 year on auto-renewable subscriptions.
**Recommendation:** 7-day free trial → auto-renew at monthly price.

**Google:** same options, broadly. Set up via the Play Console's
"Introductory price" feature.

Both stores require disclosing the trial → paid auto-renewal clearly
BEFORE the purchase sheet is shown. RevenueCat handles this disclosure
automatically.

---

## Tax handling

| Channel | Who handles tax? |
|---|---|
| Stripe | We do — enable Stripe Tax (+0.5%) or self-file. |
| Apple | Apple withholds VAT in EU, GST in AU, etc. We see the net. |
| Google | Same — Play handles tax in regulated regions. |

Apple/Google make life easier internationally. Web subscribers across
borders are our headache (Stripe Tax solves it).

---

## What happens at the next milestone

When ADRO LAB Inc. crosses **$1M in annual revenue**:

- **Apple:** Small Business Program automatically lapses. New rate =
  30% year 1 / 15% year 2+. Existing subscriptions still at 15%
  through their current renewal cycle (Apple checks billing year-by-year).
- **Google:** First $1M still at 15%; revenue above $1M at 30% for the
  rest of the calendar year. Resets to 15% threshold the following
  year.

Practical impact: by the time we hit $1M, raise prices ~$2-5 to
absorb the new fees, OR be at scale enough that the higher cut is
fine.

---

## Recommended final prices for launch

Given the analysis above, my recommendation:

| Plan | Web (Stripe) | iOS + Android | Net (mobile, 15%) |
|---|---|---|---|
| Investor Pro | $499/mo launch · $999/mo regular | **Same** (parity) | $424 / $849 |
| Adviser Pro | $99/mo launch · $199/mo regular | **Same** (parity) | $84 / $169 |

Ship parity at launch. Revisit after 90 days of real data.

**Annual plans** (optional, recommended): Apple/Google handle these
natively, and they reduce churn meaningfully. Suggested:

| Plan | Monthly | Annual (~16% discount) | Annual launch |
|---|---|---|---|
| Investor Pro | $499 / $999 | $4,990 / $9,990 | (apply same 50% promo) |
| Adviser Pro | $99 / $199 | $990 / $1,990 | (apply same 50% promo) |

---

## Action items for Babak

Before PR 7 (RevenueCat) goes live, decide:

1. [ ] **Final launch prices** for Investor Pro + Adviser Pro (current:
   $499 + $99 monthly). Confirm or change.
2. [ ] **Annual prices** — yes/no for v1 launch.
3. [ ] **Trial length** (recommend 7 days).
4. [ ] **App-store pricing** — parity with web, or up-priced to absorb
   15% fee?
5. [ ] **Apple Small Business Program** — apply at
   https://developer.apple.com/app-store/small-business-program/
   AFTER Apple Developer Program enrolment completes. Cannot apply
   before enrolling.

---

## References

- Apple App Store Small Business Program — https://developer.apple.com/app-store/small-business-program/
- Apple App Store Review Guidelines — https://developer.apple.com/app-store/review/guidelines/
- Google Play subscription fees — https://support.google.com/googleplay/android-developer/answer/112622
- Stripe pricing — https://stripe.com/pricing
- RevenueCat pricing — https://www.revenuecat.com/pricing
- EU Digital Markets Act + Apple — https://developer.apple.com/support/dma-and-apps-in-the-eu/
- Google Play user-choice billing (EU) — https://support.google.com/googleplay/android-developer/answer/12818956
