/**
 * RevenueCat — single source of truth for iOS / Android in-app purchase.
 *
 * Web (Stripe) is unaffected. RevenueCat runs only inside Capacitor
 * native shells.
 *
 * Setup checklist (done by Babak in his RevenueCat dashboard once he
 * signs up at https://app.revenuecat.com/signup):
 *   1. Create an app in RevenueCat → app store ID = `app.realsight.invest`.
 *   2. Add the iOS API key to Vercel env as `VITE_REVENUECAT_IOS_KEY`.
 *      (RevenueCat dashboard → Project → API keys.)
 *   3. Add the Android API key to `VITE_REVENUECAT_ANDROID_KEY`.
 *   4. Create products in App Store Connect + Play Console with the
 *      product IDs declared in PRODUCT_IDS below.
 *   5. Map both products to the same Entitlement called "pro" in
 *      RevenueCat. That's how we check "is this user paid?".
 *   6. Configure the webhook to point at the Supabase edge function
 *      `revenuecat-webhook` (URL printed at deploy time).
 *
 * Until those keys exist, every method in here is a graceful no-op so
 * the iOS/Android builds don't crash on first launch.
 */
import {
  Purchases,
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesOffering,
} from '@revenuecat/purchases-capacitor';
import { isCapacitorIos, isCapacitorAndroid, isCapacitorNative } from '@/lib/capacitor';

/** App-side product IDs. Must match what's created in App Store Connect + Play Console. */
export const PRODUCT_IDS = {
  investor_pro_monthly: 'realsight_investor_pro_monthly',
  investor_pro_annual:  'realsight_investor_pro_annual',
  adviser_pro_monthly:  'realsight_adviser_pro_monthly',
  adviser_pro_annual:   'realsight_adviser_pro_annual',
} as const;

/** RevenueCat Entitlement that gates Pro features. */
export const ENTITLEMENT_PRO = 'pro';

let initialized = false;

/**
 * Initialise RevenueCat with the platform's API key. Safe to call
 * multiple times — subsequent calls are ignored.
 *
 * Call this once after auth resolves, passing the Supabase user id
 * so RevenueCat associates purchases with the same identity we use
 * everywhere else (joining web Stripe + mobile IAP into one user view).
 */
export async function initRevenueCat(supabaseUserId: string | null | undefined): Promise<void> {
  if (initialized || !isCapacitorNative()) return;
  const iosKey = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
  const androidKey = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined;
  const apiKey = isCapacitorIos() ? iosKey : isCapacitorAndroid() ? androidKey : undefined;

  if (!apiKey) {
    // Babak hasn't configured the key yet — no-op so the build doesn't
    // crash on first launch.
    console.info('[revenuecat] no API key configured for this platform; IAP disabled.');
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey,
      appUserID: supabaseUserId ?? undefined,
    });
    initialized = true;
  } catch (err) {
    console.error('[revenuecat] configure failed:', err);
  }
}

/** Has the user got the "pro" entitlement (i.e. an active paid sub)? */
export async function isProActive(): Promise<boolean> {
  if (!isCapacitorNative() || !initialized) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
  } catch (err) {
    console.error('[revenuecat] getCustomerInfo failed:', err);
    return false;
  }
}

/** Fetch the catalogue of products configured in RevenueCat. */
export async function fetchOfferings(): Promise<PurchasesOffering | null> {
  if (!isCapacitorNative() || !initialized) return null;
  try {
    const { current } = await Purchases.getOfferings();
    return current ?? null;
  } catch (err) {
    console.error('[revenuecat] getOfferings failed:', err);
    return null;
  }
}

/** Present the native purchase sheet for a given package. */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ customerInfo: CustomerInfo } | null> {
  if (!isCapacitorNative() || !initialized) {
    console.warn('[revenuecat] purchase attempted outside Capacitor native.');
    return null;
  }
  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    return { customerInfo: result.customerInfo };
  } catch (err) {
    // RevenueCat throws on user-cancellation; check the userCancelled flag.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (err as any)?.code;
    if (code === 'PURCHASE_CANCELLED' || code === '1') {
      // User dismissed — not an error.
      return null;
    }
    console.error('[revenuecat] purchase failed:', err);
    throw err;
  }
}

/** Restore purchases (App Store rules require this button on every paywall). */
export async function restorePurchases(): Promise<boolean> {
  if (!isCapacitorNative() || !initialized) return false;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
  } catch (err) {
    console.error('[revenuecat] restore failed:', err);
    return false;
  }
}
