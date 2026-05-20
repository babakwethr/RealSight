# Liquid Glass tab bar — Xcode setup

The native iOS plugin source lives at
`ios/App/App/Plugins/LiquidGlassTabBar/LiquidGlassTabBarPlugin.swift`.

For Xcode to compile + register the plugin, the file needs to be **added
to the App target** in the Xcode project — Capacitor doesn't auto-pick
up source files under `App/App/Plugins/`.

This is a **one-time** setup. After this, every `npx cap sync ios` keeps
the project healthy.

---

## Steps

1. **Open the project in Xcode**
   ```bash
   cd ios/App
   pod install                # in case Capacitor pods need refresh
   open App.xcworkspace
   ```

2. **Drag the Plugins folder into Xcode**
   - In the Xcode left sidebar, right-click the `App` group (the blue
     folder under "App").
   - Choose **Add Files to "App"…**.
   - Navigate to `ios/App/App/Plugins/`.
   - **Check:** "Create groups" + "Add to target: App".
   - Click **Add**.

3. **Verify the file is in the target**
   - Click `LiquidGlassTabBarPlugin.swift` in the sidebar.
   - In the right inspector, "Target Membership" → ensure **App is
     ticked**.

4. **Build**
   - Cmd-B. Should succeed with no errors.
   - If it fails with "No such module 'Capacitor'", run `pod install`
     in `ios/App` first.

5. **Run on a real iPhone (recommended)**
   - Connect an iPhone running iOS 17+.
   - Select it as the run target → Cmd-R.
   - The web app loads with the native glass bar at the bottom
     instead of the web `MobileNav` component.

---

## How to verify it's actually using Liquid Glass (iOS 26+)

In Safari's Web Inspector (Develop → your iPhone → RealSight), run:

```js
import('@/plugins/liquid-glass-tab-bar').then(({ LiquidGlassTabBar }) =>
  LiquidGlassTabBar.isAvailable().then(console.log)
);
```

Expected on iOS 26+:
```json
{ "available": true, "material": "liquid-glass", "minSatisfied": true }
```

On iOS 17–25:
```json
{ "available": true, "material": "blur-fallback", "minSatisfied": true }
```

---

## What to test on a TestFlight build

- Each tab tap navigates correctly + the active highlight moves.
- The bar persists across route changes (we don't unmount/remount).
- The bar disappears on `/login` / `/onboarding` (those routes don't
  mount MobileNav — by design).
- A rotation between portrait/landscape keeps the bar pinned to the
  bottom safe area.
- Modals (auth, drawers) appear ABOVE the tab bar (we add the bar to
  the key window's `safeAreaLayoutGuide.bottomAnchor`, sheets sit on
  top because they're modal presentations).

---

## Future improvements (post-launch)

- Add a haptic on every tap (already implemented via
  `UIImpactFeedbackGenerator(.light)`).
- Animate the active-tint transition with `UIView.animate`.
- Support badges (the API + Swift already accept them — wire from
  React state once we have unread counters).
- Make the FAB ("Analyze") visually distinct in the native bar with a
  raised pill — currently identical to other tabs.
