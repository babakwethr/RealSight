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
