/**
 * uploadPdfForShare — push a generated PDF blob into the deal-reports
 * Supabase Storage bucket and return its public URL.
 *
 * Used by the WhatsApp share flow (the prefilled message contains this
 * URL — the recipient taps the link to open the PDF in their browser).
 *
 * Path convention: `{tenant_id}/{uuid}.pdf` — must match the RLS policy
 * `deal_reports_tenant_insert` defined in the RERA migration. The first
 * folder segment must equal the user's tenant_id from `profiles`.
 */
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'deal-reports';

export interface UploadedPdf {
  /** Public URL clients can open in a browser. */
  publicUrl: string;
  /** Storage path (tenant_id/uuid.pdf) — useful for later deletion. */
  path: string;
}

export async function uploadPdfForShare(
  pdfBlob: Blob,
  opts: { tenantId: string; filenameSlug?: string },
): Promise<UploadedPdf> {
  // UUIDs avoid collisions and aren't guessable — important since the
  // bucket is public-read.
  const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  const safeSlug = (opts.filenameSlug ?? 'report')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'report';

  const path = `${opts.tenantId}/${uuid}-${safeSlug}.pdf`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdfBlob, {
      contentType: 'application/pdf',
      cacheControl: '31536000', // 1 year — content is immutable per UUID
      upsert: false,
    });

  if (error) {
    // Most likely cause: RLS rejected because the user's tenant_id
    // doesn't match the path's first segment. Surface a clean message.
    throw new Error(`Failed to upload report: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}
