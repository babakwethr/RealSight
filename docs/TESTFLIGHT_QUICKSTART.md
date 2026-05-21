# RealSight — TestFlight quick-start

A focused checklist to get **RealSight** onto TestFlight for internal
testing. Aimed at the developer doing the Xcode work.

This is **TestFlight only** — not a public App Store submission. We're
deliberately using an existing Apple Developer account just to test on
real devices; the public launch will happen later under the final
company entity. TestFlight builds are private and this choice is fully
reversible (App Transfer, or simply a fresh app record later).

For the full public-launch playbook see `APPLE_APP_STORE_LAUNCH.md`.

---

## App facts

| | |
|---|---|
| Bundle ID | `app.realsight.invest` |
| App name | RealSight |
| Framework | Capacitor 8 (web app in a WKWebView) |
| Xcode project | `ios/App/App.xcworkspace` |
| Min iOS | 14+ (Capacitor 8 default) |

---

## Prerequisites (on the Mac doing the build)

- macOS with **Xcode 16+** (Xcode 26 used for the first build)
- **Node 18+** + `npm`
- Signed into Xcode with an Apple ID that's a member of the Apple
  Developer team you're testing under (Xcode → Settings → Accounts)

> The project uses Swift Package Manager — **no CocoaPods needed**.
> Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are committed
> in `.env.production`, so `npm run build` produces a working app. Do
> NOT build without those — the native app boots to a blank navy
> screen if the Supabase client can't initialise.

---

## Steps

### 1. Build the web app + sync into iOS

```bash
git clone <repo> && cd <repo>     # or pull latest
npm install
npm run build
npx cap sync ios
```

### CLI archive + upload (what we actually used)

The whole archive + upload can be driven from the terminal — no
Xcode GUI needed. From `ios/App`:

```bash
# 1. Archive
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/RealSight-App.xcarchive archive -allowProvisioningUpdates

# 2. Export + upload (exportOptions plist: method=app-store-connect,
#    teamID=VUBM98B6AJ, destination=upload, signingStyle=automatic)
xcodebuild -exportArchive -archivePath /tmp/RealSight-App.xcarchive \
  -exportPath /tmp/RealSight-upload \
  -exportOptionsPlist /tmp/uploadOptions.plist -allowProvisioningUpdates
```

Bump the build number before each upload: `cd ios/App && xcrun agvtool next-version -all`.

The Xcode-GUI path below is the alternative if you prefer it.

---

`cap sync` copies the built web app into `ios/App/App/public/` and
refreshes the native dependencies (runs `pod install`).

### 2. Open the project

```bash
open ios/App/App.xcworkspace
```

Open the **`.xcworkspace`**, not the `.xcodeproj` — CocoaPods.

### 3. (Optional) add the Liquid Glass tab bar plugin

The native iOS 26 Liquid Glass tab bar plugin lives at
`ios/App/App/Plugins/LiquidGlassTabBar/`. Capacitor does **not**
auto-add source files there to the target.

- If you want to test the native tab bar: follow
  `docs/LIQUID_GLASS_TAB_BAR_SETUP.md` (one-time, ~3 min).
- If you skip it: the app falls back to the web tab bar — totally
  fine for a first TestFlight. Add it later.

### 4. Signing

- Select the **App** target → **Signing & Capabilities**.
- Tick **Automatically manage signing**.
- Set **Team** to the Apple Developer team you're testing under.
- Xcode will register the `app.realsight.invest` App ID + create the
  provisioning profile automatically.

### 5. Bump the build number

- App target → **General** → **Identity**.
- Increment **Build** (e.g. `1`). Version can stay `1.0`.
- Every TestFlight upload needs a unique build number.

### 6. Archive

- Top device selector → **Any iOS Device (arm64)**.
- Menu: **Product → Archive**.
- When the Organizer opens, select the archive → **Distribute App**
  → **TestFlight & App Store Connect** → **Upload**.
- Accept the automatic signing prompts.

### 7. App Store Connect record

If this is the very first upload, the app record may need to exist
first:

- Go to <https://appstoreconnect.apple.com> → **Apps → +** → **New App**.
- Platform iOS, name "RealSight" (or "RealSight Beta" if the name
  collides), Bundle ID `app.realsight.invest`, SKU `realsight-001`.
- (Xcode 15+ can also auto-create it on upload — either works.)

### 8. Export compliance

- The app uses only standard HTTPS/TLS — no custom crypto.
- `Info.plist` already sets `ITSAppUsesNonExemptEncryption = false`,
  so App Store Connect should not prompt. If it does, answer
  **"No"** to "uses non-exempt encryption".

### 9. Wait for processing

- The build shows up under **TestFlight** in ~10-30 min while Apple
  processes it. Status goes `Processing` → `Ready to Test`.

### 10. Add testers

- **Internal testers** (fastest, up to 100): TestFlight → Internal
  Testing → add anyone who's on the Apple Developer team. No review.
- **External testers** (the friend, if not on the team): TestFlight
  → add an external group → invite by email. The **first** external
  build needs a quick Beta App Review (usually < 24 h); afterwards
  it's instant.
- Each tester gets an email → installs the **TestFlight** app from
  the App Store → taps the invite → installs RealSight.

---

## Known notes for the tester

- Sign-in: Google OAuth opens Safari, then returns to the app via the
  `app.realsight.invest://` URL scheme. This is expected.
- Live data (DLD / UK / US markets) comes from Supabase edge functions
  — needs a network connection.
- If the native Liquid Glass tab bar wasn't added (step 3), the app
  shows the web glass tab bar instead — not a bug.

---

## What's deliberately NOT done yet

- Public App Store listing, screenshots, description — see
  `APPLE_APP_STORE_LAUNCH.md`.
- In-app purchases — RevenueCat products aren't created yet; the
  Upgrade button will route to Stripe on web. Fine for testing.
- Final company entity — TestFlight runs under the interim account;
  public launch moves to the final entity later.
