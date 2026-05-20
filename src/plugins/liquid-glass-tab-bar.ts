/**
 * LiquidGlassTabBar — TS bridge for the native iOS plugin in
 * `ios/App/App/Plugins/LiquidGlassTabBar/`. Web fallback is a no-op
 * (the existing `MobileNav.tsx` web component handles non-Capacitor
 * platforms).
 *
 * Renders a native UIView overlay at the bottom of the iOS screen.
 *   - iOS 26+ → real Liquid Glass material (UIGlassEffect).
 *   - iOS 17–25 → UIBlurEffect.systemThickMaterialDark fallback.
 *
 * Architecture:
 *   1. React mounts → call `present({ items, activeIndex })`.
 *   2. User taps a tab → native plugin emits 'tabSelected' → React
 *      navigates via React Router (web URL stays the source of truth).
 *   3. React route changes → call `setActiveIndex(index)` so the
 *      highlight matches the URL.
 *   4. React unmounts → call `hide()`.
 *
 * See `src/components/layout/MobileNav.tsx` for the consumer wiring.
 */
import { registerPlugin } from '@capacitor/core';

export interface LiquidGlassTabBarItem {
  /** Visible label below the icon. */
  title: string;
  /** SF Symbol name — e.g. "house.fill", "chart.bar.fill", "person.fill". */
  icon: string;
  /** Optional badge text (number or "•"). */
  badge?: string;
}

export interface PresentOptions {
  items: LiquidGlassTabBarItem[];
  activeIndex?: number;
}

export interface TabSelectedEvent {
  index: number;
}

export interface AvailabilityInfo {
  available: boolean;
  /** "liquid-glass" (iOS 26+) or "blur-fallback" (iOS 17–25). */
  material: 'liquid-glass' | 'blur-fallback';
  /** Whether the minimum iOS version (17) is satisfied. */
  minSatisfied: boolean;
}

export interface LiquidGlassTabBarPlugin {
  present(options: PresentOptions): Promise<void>;
  hide(): Promise<void>;
  setActiveIndex(options: { index: number }): Promise<void>;
  isAvailable(): Promise<AvailabilityInfo>;
  addListener(
    eventName: 'tabSelected',
    listenerFunc: (event: TabSelectedEvent) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  removeAllListeners(): Promise<void>;
}

/**
 * Web fallback — every method is a no-op so the web build doesn't
 * crash when MobileNav imports this. On the web we render the existing
 * MobileNav React component instead.
 */
const webFallback: LiquidGlassTabBarPlugin = {
  present: () => Promise.resolve(),
  hide: () => Promise.resolve(),
  setActiveIndex: () => Promise.resolve(),
  isAvailable: () =>
    Promise.resolve({ available: false, material: 'blur-fallback', minSatisfied: false }),
  addListener: () => Promise.resolve({ remove: () => Promise.resolve() }),
  removeAllListeners: () => Promise.resolve(),
};

export const LiquidGlassTabBar = registerPlugin<LiquidGlassTabBarPlugin>('LiquidGlassTabBar', {
  web: () => webFallback,
});
