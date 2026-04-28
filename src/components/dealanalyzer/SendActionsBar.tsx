/**
 * SendActionsBar — the trio of actions an adviser takes after a Deal
 * Analysis runs: download the PDF, email it to the client, or share via
 * WhatsApp.
 *
 * Replaces the previous scattered "Deal Report PDF" / "Investor
 * Presentation PDF" buttons with one cohesive action bar.
 *
 * Email: opens SendModal → calls the `send-deal-report` edge function.
 * WhatsApp: uploads the PDF to Supabase Storage → opens wa.me with a
 *           prefilled message containing the public PDF URL + a
 *           "Powered by RealSight" line so every send is a marketing
 *           touch.
 *
 * Pro gating retained: Investor Pro+ for download, Adviser Pro for
 * email + WhatsApp (the actions that are adviser-specific). Free users
 * still see the buttons but they nudge to /billing.
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
      toast.success('Report downloaded.');
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
      // Prefer the short branded URL (realsight.app/r/{id}) over the
      // raw Supabase storage URL — looks much better in a WhatsApp
      // message. Falls back to publicUrl automatically if short-link
      // creation fails (e.g. RLS issue).
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

      // wa.me opens WhatsApp with a prefilled message; the adviser
      // picks the recipient inside their own WhatsApp app/web.
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
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownload}
          disabled={disabled || downloading}
          className="gap-1.5 text-xs"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download PDF
          {!isPro && <span className="text-[9px] font-bold text-amber-300 border border-amber-300/30 bg-amber-300/10 px-1 rounded">PRO</span>}
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
          {!isAdviserPro && <span className="text-[9px] font-bold text-amber-300 border border-amber-300/30 bg-amber-300/10 px-1 rounded">ADVISER PRO</span>}
        </Button>

        <Button
          size="sm"
          onClick={handleWhatsApp}
          disabled={disabled || whatsapping}
          className="gap-1.5 text-xs text-black"
          style={{ background: 'linear-gradient(90deg, #25D366 0%, #128C7E 100%)' }}
        >
          {whatsapping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
          Send via WhatsApp
          {!isAdviserPro && <span className="text-[9px] font-bold text-amber-200 border border-amber-200/30 bg-black/20 px-1 rounded">ADVISER PRO</span>}
        </Button>
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
