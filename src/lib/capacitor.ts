/**
 * Capacitor platform helpers.
 * Safe to import in web — all checks guard against missing window.Capacitor.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isCapacitorNative = (): boolean =>
  !!(window as any).Capacitor?.isNativePlatform?.();

/** True only on the Capacitor iOS shell (excludes Android + web). */
export const isCapacitorIos = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios';
};

/** True only on the Capacitor Android shell. */
export const isCapacitorAndroid = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'android';
};

export const CAPACITOR_SCHEME = 'app.realsight.invest';
export const CAPACITOR_OAUTH_REDIRECT = `${CAPACITOR_SCHEME}://auth/callback`;

/**
 * Fire a light haptic tap. Used for tactile feedback on autocomplete
 * selection, primary CTA presses, filter toggles, etc. No-op on web.
 *
 * We dynamic-import `@capacitor/haptics` so the web bundle doesn't pay
 * for it. Errors are swallowed — haptics are nice-to-have, never
 * load-bearing.
 */
export async function lightTap(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const mod = await import('@capacitor/haptics');
    await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
  } catch { /* swallow — haptics are best-effort */ }
}

/** Medium-intensity tap. Use for "you committed to something" feedback. */
export async function mediumTap(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const mod = await import('@capacitor/haptics');
    await mod.Haptics.impact({ style: mod.ImpactStyle.Medium });
  } catch { /* swallow */ }
}
