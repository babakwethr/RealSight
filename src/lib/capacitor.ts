/**
 * Capacitor platform helpers.
 * Safe to import in web — all checks guard against missing window.Capacitor.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isCapacitorNative = (): boolean =>
  !!(window as any).Capacitor?.isNativePlatform?.();

export const CAPACITOR_SCHEME = 'app.realsight.invest';
export const CAPACITOR_OAUTH_REDIRECT = `${CAPACITOR_SCHEME}://auth/callback`;
