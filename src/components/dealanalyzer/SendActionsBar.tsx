/**
 * SendActionsBar — the trio of actions an adviser takes after a Deal
 * Analysis: Download / Email / WhatsApp. All three deliver the SAME
 * 6-page branded investor presentation (cover, property + market
 * snapshot, pricing & investment analysis, AI verdict, optional
 * gallery, branded closing).
 *
 * Visual history
 * --------------
 * v1 — three flat outline buttons (founder feedback: nobody knew
 *      what they were downloading, looked like a generic toolbar)
 * v2 — a full hero card with chip row + sub-labels (founder
 *      feedback: "too much text, full text page, leaves empty
 *      space on the left")
 * v3 — THIS file. A tight horizontal strip:
 *      • one short eyebrow line that names what the asset is
 *        ("6-page investor deck · AI verdict · photos · pricing")
 *      • three compact buttons in a single row underneath
 *      No card wrapper, no sub-labels, no chip row. Same value
 *      message, ~80% less ink.
 *
 * Pro gating retained: Investor Pro+ for download, Adviser Pro for
 * email + WhatsApp. Free users still see the buttons but they
 * nudge to /billing.
 *
 * Props are unchanged — call sites keep working.
 */
import { useState } from 'react';
import { Download, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { SendModal } from './SendModal';
import { uploadPdfForShare } from '@/lib/uploadPdfForShare';

export interface SendActionsBarProps {
  /** Generates the PDF blob — single source so all three actions stay in sync. */
  generatePdf: () => Promise<Blob>;
  propertyName: string;
  /** Adviser tenant id — required for WhatsApp upload (path is `{tenant_id}/{uuid}.pdf`). */
  tenantId?: string;
  /** Adviser brand name — used in the WhatsApp message footer. */
  brandName?: string;
  /** Tenant slug — used for the "Powered by RealSight · realsight.app/a/{slug}" line. */
  tenantSlug?: string;
  /** Disable everything when AI verdict is still loading. */
  disabled?: boolean;
}

export function SendActionsBar({
  generatePdf,
  propertyName,
  tenantId,
  brandName,
  tenantSlug,
  disabled,
}: SendActionsBarProps) {
  const { isPro, isAdviserPro } = useSubscription();
  const [downloading, setDownloading] = useState(false);
  const [whatsapping, setWhatsapping] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const handleDownload = async () => {
    if (!isPro) {
      toast.info('Upgrade to download the PDF report.', {
        action: { label: 'Upgrade', onClick: () => location.assign('/billing') },
      });
      return;
    }
    setDownloading(true);
    try {
      const blob = await generatePdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RealSight_${propertyName.replace(/\s+/g, '_').slice(0, 60)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Investor presentation downloaded.');
    } catch (e) {
      toast.error('Download failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setDownloading(false);
    }
  };

  const handleEmail = () => {
    if (!isAdviserPro) {
      toast.info('Email-to-client is an Adviser Pro feature.', {
        action: { label: 'Upgrade', onClick: () => location.assign('/billing') },
      });
      return;
    }
    setEmailOpen(true);
  };

  const handleWhatsApp = async () => {
    if (!isAdviserPro) {
      toast.info('WhatsApp share is an Adviser Pro feature.', {
        action: { label: 'Upgrade', onClick: () => location.assign('/billing') },
      });
      return;
    }
    if (!tenantId) {
      toast.error('Your adviser workspace isn\'t set up yet — finish onboarding first.');
      return;
    }
    setWhatsapping(true);
    try {
      const blob = await generatePdf();
      const { shortUrl } = await uploadPdfForShare(blob, {
        tenantId,
        filenameSlug: propertyName,
      });

      const slugLine = tenantSlug ? `realsight.app/a/${tenantSlug}` : 'realsight.app';
      const brand = brandName || 'your adviser';
      const text = [
        `Hi! Here's the property analysis I prepared for you:`,
        `${propertyName}`,
        ``,
        shortUrl,
        ``,
        `— ${brand}`,
        `Powered by RealSight · ${slugLine}`,
      ].join('\n');

      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      toast.success('WhatsApp opened', {
        description: 'Pick the contact and hit send. The PDF link is in the message.',
      });
    } catch (e) {
      toast.error('Could not prepare WhatsApp share', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setWhatsapping(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        {/* One-line value tag — names what the asset is so nobody
            wonders what they're about to download / share. Kept as a
            single muted line to avoid the "wall of text" feel. */}
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-300/80">
          6-page investor deck · AI verdict · photos · pricing
        </p>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={disabled || downloading}
            className="gap-1.5 text-xs"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download PDF
            {!isPro && (
              <span className="text-[9px] font-bold text-amber-300 border border-amber-300/30 bg-amber-300/10 px-1 rounded">
                PRO
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleEmail}
            disabled={disabled}
            className="gap-1.5 text-xs"
          >
            <Mail className="h-3.5 w-3.5" />
            Email to client
            {!isAdviserPro && (
              <span className="text-[9px] font-bold text-amber-300 border border-amber-300/30 bg-amber-300/10 px-1 rounded">
                ADVISER PRO
              </span>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleWhatsApp}
            disabled={disabled || whatsapping}
            className="gap-1.5 text-xs text-black shadow-[0_2px_12px_-3px_rgba(37,211,102,0.5)]"
            style={{ background: 'linear-gradient(90deg, #25D366 0%, #128C7E 100%)' }}
          >
            {whatsapping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
            Send via WhatsApp
            {!isAdviserPro && (
              <span className="text-[9px] font-bold text-amber-200 border border-amber-200/30 bg-black/20 px-1 rounded">
                ADVISER PRO
              </span>
            )}
          </Button>
        </div>
      </div>

      <SendModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        generatePdf={generatePdf}
        propertyName={propertyName}
      />
    </>
  );
}
