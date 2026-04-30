/**
 * SendActionsBar — the deliverable card at the bottom of a Deal
 * Analysis. The three actions (Download / Email / WhatsApp) all
 * produce the SAME asset: a 6–7 page branded investor presentation
 * (see InvestorPresentationPDF.tsx) with cover, property + market
 * snapshot, pricing & investment analysis, AI verdict, optional
 * listing gallery, and a closing slide with adviser identity.
 *
 * The previous design read like a generic toolbar — three small
 * outline buttons that did not communicate that the user is about
 * to download / share an actual investor pitch deck. Founder QA
 * 1 May 2026: "they don't know what they're downloading". So this
 * version frames the whole thing as a deliverable: a card titled
 * "Investor Presentation ready", a feature-chip row showing what's
 * inside (AI verdict, photos, pricing, yield), and three channel
 * tiles (instead of buttons) where each one carries a sub-label so
 * the adviser knows *what* each action does, not just *which icon*.
 *
 * Email: opens SendModal → calls the `send-deal-report` edge function.
 * WhatsApp: uploads the PDF to Supabase Storage → opens wa.me with a
 *           prefilled message containing the public PDF URL + a
 *           "Powered by RealSight" line so every send is a marketing
 *           touch.
 *
 * Pro gating retained: Investor Pro+ for download, Adviser Pro for
 * email + WhatsApp. Free users still see the tiles but they nudge
 * to /billing.
 *
 * Props are unchanged from the previous version — call sites
 * keep working.
 */
import { useState } from 'react';
import {
  Download, Mail, MessageCircle, Loader2, FileText,
  Sparkles, Image as ImageIcon, BarChart3, ShieldCheck, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { SendModal } from './SendModal';
import { uploadPdfForShare } from '@/lib/uploadPdfForShare';
import { cn } from '@/lib/utils';

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

interface ChannelTileProps {
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  loading?: boolean;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  whatsapp?: boolean;
  proLabel?: string;
}

/** Single channel tile — used for Download / Email / WhatsApp. */
function ChannelTile({
  icon, label, subLabel, loading, onClick, disabled, primary, whatsapp, proLabel,
}: ChannelTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'group relative flex flex-col items-start text-left gap-2 px-4 py-3.5 rounded-2xl',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'min-w-[170px] flex-1',
        whatsapp
          ? 'text-emerald-50 ring-1 ring-emerald-300/40 hover:ring-emerald-300/70 hover:-translate-y-0.5 shadow-[0_4px_24px_-6px_rgba(37,211,102,0.4)]'
          : primary
            ? 'bg-white/[0.06] ring-1 ring-amber-300/30 hover:ring-amber-300/60 hover:-translate-y-0.5 hover:bg-white/[0.08] text-white'
            : 'bg-white/[0.03] ring-1 ring-white/[0.08] hover:ring-white/[0.18] hover:-translate-y-0.5 hover:bg-white/[0.05] text-white'
      )}
      style={whatsapp ? {
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 70%, #0d6b5e 100%)',
      } : undefined}
    >
      {/* Top row: icon + pro chip */}
      <div className="flex items-center justify-between w-full">
        <span
          className={cn(
            'inline-flex items-center justify-center h-9 w-9 rounded-xl shrink-0',
            whatsapp
              ? 'bg-black/20 ring-1 ring-white/20'
              : primary
                ? 'bg-amber-300/15 ring-1 ring-amber-300/30 text-amber-200'
                : 'bg-white/[0.06] ring-1 ring-white/[0.10] text-white/85'
          )}
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : icon}
        </span>
        {proLabel && (
          <span
            className={cn(
              'text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase shrink-0',
              whatsapp
                ? 'bg-black/25 text-emerald-50 ring-1 ring-white/20'
                : 'bg-amber-300/10 text-amber-300 ring-1 ring-amber-300/30'
            )}
          >
            {proLabel}
          </span>
        )}
      </div>

      {/* Label + sub-label */}
      <div className="min-w-0">
        <p className={cn(
          'text-[14px] font-bold leading-tight',
          whatsapp ? 'text-white' : 'text-white'
        )}>
          {label}
        </p>
        <p className={cn(
          'text-[11px] leading-snug mt-0.5',
          whatsapp ? 'text-emerald-50/80' : 'text-white/55'
        )}>
          {subLabel}
        </p>
      </div>
    </button>
  );
}

/** Feature chip in the "what's inside" row. */
function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] text-[11px] font-semibold text-white/75">
      <span className="text-amber-300/90">{icon}</span>
      {label}
    </span>
  );
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
      <section
        className="relative rounded-2xl ring-1 ring-white/[0.08] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent overflow-hidden"
        aria-label="Investor presentation actions"
      >
        {/* Subtle accent strip — matches the .accent-amber treatment elsewhere */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(252, 211, 77, 0.5), transparent)' }}
        />

        <div className="px-5 sm:px-6 py-5">
          {/* Hero row — icon + title + subtitle + meta badge */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-300/30 to-amber-300/5 ring-1 ring-amber-300/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-200" />
              </div>
              {/* Tiny "PDF" tag tucked into the corner */}
              <span className="absolute -bottom-1 -right-1 text-[8px] font-black tracking-widest bg-amber-300 text-amber-950 px-1 py-px rounded shadow">
                PDF
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-amber-300 mb-0.5">
                Your investor presentation is ready
              </p>
              <p className="text-[15px] sm:text-[16px] font-bold text-white leading-tight truncate">
                {propertyName || 'Investor presentation'}
              </p>
              <p className="text-[11px] text-white/55 mt-0.5">
                Branded 6-page deck · ready to send to your client today
              </p>
            </div>
          </div>

          {/* What's inside — feature chip row */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <FeatureChip icon={<Sparkles className="h-3 w-3" />} label="AI Investment Verdict" />
            <FeatureChip icon={<ImageIcon className="h-3 w-3" />} label="Listing Photos" />
            <FeatureChip icon={<BarChart3 className="h-3 w-3" />} label="Pricing Benchmarks" />
            <FeatureChip icon={<Building2 className="h-3 w-3" />} label="Market Snapshot" />
            <FeatureChip icon={<ShieldCheck className="h-3 w-3" />} label="Branded Closing" />
          </div>

          {/* Channel tiles */}
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 mb-2">
            Send the same report through
          </p>
          <div className="flex flex-wrap gap-2">
            <ChannelTile
              icon={<Download className="h-4 w-4" />}
              label="Download PDF"
              subLabel="Save the full deck to your device"
              loading={downloading}
              onClick={handleDownload}
              disabled={disabled}
              primary
              proLabel={!isPro ? 'PRO' : undefined}
            />

            <ChannelTile
              icon={<Mail className="h-4 w-4" />}
              label="Email to client"
              subLabel="Send the same deck by email"
              onClick={handleEmail}
              disabled={disabled}
              proLabel={!isAdviserPro ? 'ADVISER PRO' : undefined}
            />

            <ChannelTile
              icon={<MessageCircle className="h-4 w-4" />}
              label="Send via WhatsApp"
              subLabel="Share with your branded short link"
              loading={whatsapping}
              onClick={handleWhatsApp}
              disabled={disabled}
              whatsapp
              proLabel={!isAdviserPro ? 'ADVISER PRO' : undefined}
            />
          </div>
        </div>
      </section>

      <SendModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        generatePdf={generatePdf}
        propertyName={propertyName}
      />
    </>
  );
}
