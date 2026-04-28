/**
 * uploadPdfForShare — push a generated PDF blob into the deal-reports
 * Supabase Storage bucket and return:
 *   - the long Supabase Storage URL (kept for fallback / debugging)
 *   - a short `realsight.app/r/{id}` URL the adviser can paste into
 *     WhatsApp / email without it looking like a tracker URL
 *
 * Used by the WhatsApp share flow. Founder QA (29 Apr 2026): the raw
 * Supabase URL `hcbpveurcfdvfjskovvf.supabase.co/storage/...` looked
 * unprofessional inside a WhatsApp message — short URL fixes that.
 *
 * Path convention: `{tenant_id}/{uuid}.pdf` — must match the RLS policy
 * `deal_reports_tenant_insert` defined in the RERA migration. The first
 * folder segment must equal the user's tenant_id from `profiles`.
 */
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'deal-reports';

/** Where to root the short-link domain. We resolve from the current host
 *  so dev (`localhost:5173`) / preview (`*.vercel.app`) / prod
 *  (`www.realsight.app`) all produce a usable link. */
function resolveShortBase(): string {
  if (typeof window === 'undefined') return 'https://www.realsight.app';
  const { protocol, host } = window.location;
  // localhost / vercel preview won't have the Vercel rewrite in place,
  // so on those we fall back to the canonical domain so test shares
  // still work.
  if (host === 'localhost' || host.endsWith('.vercel.app') || host.includes('127.0.0.1')) {
    return 'https://www.realsight.app';
  }
  return `${protocol}//${host}`;
}

/** 12-char URL-safe id generated client-side. ~62^12 = 3.2e21 outcomes
 *  → collision odds essentially zero for our volume. */
function makeShortId(length = 12): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let out = '';
    for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }
  // Fallback (non-secure) — fine for non-secret IDs.
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export interface UploadedPdf {
  /** Long Supabase Storage public URL — works directly. */
  publicUrl: string;
  /** Short, branded URL — `realsight.app/r/{id}` — preferred for sharing. */
  shortUrl: string;
  /** Storage path (tenant_id/uuid.pdf) — useful for later deletion. */
  path: string;
  /** Short-link id — useful if you want to display "your share id is …". */
  shortId: string;
}

export async function uploadPdfForShare(
  pdfBlob: Blob,
  opts: { tenantId: string; filenameSlug?: string },
): Promise<UploadedPdf> {
  const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  const safeSlug = (opts.filenameSlug ?? 'report')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'report';

  const path = `${opts.tenantId}/${uuid}-${safeSlug}.pdf`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdfBlob, {
      contentType: 'application/pdf',
      cacheControl: '31536000',
      upsert: false,
    });

  if (upErr) {
    throw new Error(`Failed to upload report: ${upErr.message}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Create a short-link row pointing at the public URL.
  // We don't fail the whole flow if this errors — the caller still gets
  // a working long URL as a fallback.
  const shortId = makeShortId();
  const { data: { user } } = await supabase.auth.getUser();
  let shortUrl = publicUrl;
  try {
    const { error: slErr } = await supabase
      .from('share_links')
      .insert({
        id: shortId,
        target_url: publicUrl,
        tenant_id: opts.tenantId,
        created_by: user?.id ?? null,
      });
    if (!slErr) {
      shortUrl = `${resolveShortBase()}/r/${shortId}`;
    } else {
      console.warn('[uploadPdfForShare] short-link insert failed, falling back to long URL:', slErr.message);
    }
  } catch (e) {
    console.warn('[uploadPdfForShare] short-link insert threw, falling back to long URL:', e);
  }

  return { publicUrl, shortUrl, path, shortId };
}
