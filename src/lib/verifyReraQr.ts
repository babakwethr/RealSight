/**
 * verifyReraQr — client-side validator for adviser RERA QR uploads.
 *
 * RERA (Dubai's Real Estate Regulatory Agency) issues every licensed
 * broker a personal QR code. When scanned, it always opens a URL on a
 * `dubailand.gov.ae` subdomain — that's the whole verification model:
 * the URL itself is the proof.
 *
 * Founder ask (28 Apr 2026): we must prevent advisers from uploading
 * a random photo as their "RERA QR". Without a public DLD API there's
 * no programmatic way to confirm the broker is licensed (only manual
 * lookup). The next-best defence is decoding the QR in the browser
 * and checking the URL it points to — anything not on a DLD/RERA host
 * is rejected outright.
 *
 * Strategy:
 *   1. Load the picked image into an off-screen <canvas>.
 *   2. Read its ImageData and feed it to jsqr.
 *   3. If a QR is decoded → check the encoded text is a URL.
 *   4. If it's a URL → check the host is on a DLD allowlist.
 *
 * Every result includes the decoded URL so the calling UI can show
 * exactly what the QR encodes and link out so the founder/admin can
 * re-verify by clicking through to DLD.
 */
import jsQR from 'jsqr';

/** Hosts we trust as "this came from RERA / DLD". */
const TRUSTED_HOSTS = [
  'dubailand.gov.ae',
  'www.dubailand.gov.ae',
  'eservices.dubailand.gov.ae',
  'trakheesi.dubailand.gov.ae',
  'dubaibrokers.dubailand.gov.ae',
  // RERA still owns its own subdomain too
  'rera.gov.ae',
  'www.rera.gov.ae',
  // DLD's REST app deep links sometimes go through this domain
  'dxb.gov.ae',
  // The official Dubai REST / DXB Interact links
  'dxbinteract.com',
];

export type ReraQrCheck =
  | { status: 'ok';                decodedUrl: string; host: string }
  | { status: 'wrong-host';        decodedUrl: string; host: string }
  | { status: 'not-a-url';         decoded: string }
  | { status: 'no-qr-found' }
  | { status: 'image-load-failed'; reason: string };

/**
 * Decode the QR contained in `file`. Returns one of:
 *   - { status: 'ok', ... }              — QR decodes to a trusted DLD URL.
 *   - { status: 'wrong-host', ... }      — QR decodes to a URL but it's not DLD.
 *   - { status: 'not-a-url', ... }       — QR decodes to free text, not a URL.
 *   - { status: 'no-qr-found' }          — no QR could be detected in the image.
 *   - { status: 'image-load-failed' }    — couldn't even load the image.
 *
 * Pure browser code. No network calls. Safe to call on any picked file.
 */
export async function verifyReraQr(file: File): Promise<ReraQrCheck> {
  try {
    // Load the image into an off-screen canvas.
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Image could not be decoded'));
      i.src = url;
    }).catch(e => { URL.revokeObjectURL(url); throw e; });
    URL.revokeObjectURL(url);

    // Cap dimensions to keep getImageData fast on large uploads —
    // jsqr works fine on smaller images and a typical QR is ~512x512.
    const MAX = 1024;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { status: 'image-load-failed', reason: 'Canvas 2D context unavailable' };
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    // Try once with default options; if no code, try inverted (some
    // QRs are printed white-on-coloured backgrounds).
    let code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (!code) {
      return { status: 'no-qr-found' };
    }

    const decoded = code.data || '';
    let parsed: URL | null = null;
    try { parsed = new URL(decoded); } catch { parsed = null; }
    if (!parsed) {
      return { status: 'not-a-url', decoded };
    }

    const host = parsed.hostname.toLowerCase();
    const trusted = TRUSTED_HOSTS.some(h => host === h || host.endsWith('.' + h));
    if (!trusted) {
      return { status: 'wrong-host', decodedUrl: decoded, host };
    }
    return { status: 'ok', decodedUrl: decoded, host };
  } catch (e) {
    return {
      status: 'image-load-failed',
      reason: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/** Friendly text for each status — surfaced in the UI as toast / inline note. */
export function reraQrCheckMessage(check: ReraQrCheck): { tone: 'ok' | 'warn' | 'error'; line: string; detail?: string } {
  switch (check.status) {
    case 'ok':
      return {
        tone: 'ok',
        line: `Verified — links to ${check.host}`,
        detail: 'This appears to be a genuine RERA QR code. The full URL has been saved for compliance audit.',
      };
    case 'wrong-host':
      return {
        tone: 'error',
        line: `Not a RERA QR — points to ${check.host}`,
        detail: `Genuine RERA broker QRs link to a dubailand.gov.ae page. The QR you uploaded points to "${check.host}", which is not recognised. Please upload your official RERA QR.`,
      };
    case 'not-a-url':
      return {
        tone: 'error',
        line: 'Not a RERA QR',
        detail: `The QR contains plain text rather than a verification URL: "${check.decoded.slice(0, 80)}". Please upload your official RERA QR code.`,
      };
    case 'no-qr-found':
      return {
        tone: 'error',
        line: 'No QR code detected',
        detail: 'We couldn\'t find a QR code in this image. Please upload a clear, centred photo of your RERA QR.',
      };
    case 'image-load-failed':
      return {
        tone: 'error',
        line: 'Could not read the image',
        detail: check.reason,
      };
  }
}
