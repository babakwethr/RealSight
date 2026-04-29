/**
 * imageToDataUrl — fetch an image URL and return it as a base64 data URI.
 *
 * Why: `@react-pdf/renderer` fetches Image src URLs from inside its own
 * worker context. Those fetches silently fail in several real-world
 * cases — relative paths, cross-origin without permissive CORS,
 * and seemingly even some same-origin static assets in Vercel-served
 * PDFs (founder QA, 29 Apr 2026: PDF rendered with zero images even
 * after switching to absolute URLs).
 *
 * Pre-converting on the main thread bypasses every one of those: the
 * Image component receives a `data:image/...;base64,...` string, which
 * @react-pdf treats as already-loaded bytes and embeds verbatim.
 *
 * Used by the PDF generator helpers (DealAnalyzerPDF /
 * InvestorPresentationPDF) just before calling `pdf().toBlob()`.
 */

/** Single-image fetch + base64 conversion. Returns null on any failure
 *  so callers can fall back gracefully (e.g. show a placeholder block). */
export async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    if (!url) return null;
    if (url.startsWith('data:')) return url; // already a data URI
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) {
      console.warn('[imageToDataUrl] non-OK', r.status, url.slice(0, 80));
      return null;
    }
    const blob = await r.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[imageToDataUrl] fetch failed', url.slice(0, 80), e);
    return null;
  }
}

/** Convert an array of image URLs in parallel; null entries are dropped
 *  from the result so callers always get a clean string[]. */
export async function imagesToDataUrls(urls: string[]): Promise<string[]> {
  if (!urls?.length) return [];
  const results = await Promise.all(urls.map(imageToDataUrl));
  return results.filter((s): s is string => typeof s === 'string');
}
