/**
 * SendActionsBar — the deliverable hero. After a deal analysis runs,
 * this card frames the resulting branded investor presentation as a
 * proper trophy: gold-rimmed glass panel, an animated gradient on
 * the hero word, a PDF-icon medallion as the visual anchor, and the
 * three send channels (Download · Email · WhatsApp) right where
 * they belong.
 *
 * Visual history
 * --------------
 * v1 — three flat outline buttons (founder: nobody knew what they
 *      were downloading)
 * v2 — hero card with chip row + sub-labels (founder: too much text,
 *      empty space on the left because card was inline-right)
 * v3 — tight one-line strip + 3 buttons (founder: still too plain,
 *      this is the highlight of the page)
 * v4 — THIS file. Full-width glass-panel hero following DESIGN.md
 *      §4 (Glass Card pattern), §2 (animated gradient), §3 (510/590
 *      weights, negative letter-spacing). Gold accent treatment per
 *      §2 ("RealSight brand gold #C9A84C — premium badges, plan
 *      indicators only"). Sits as its own row under the "Analysis
 *      Results" heading so left/right layout is balanced.
 *
 * Anatomy
 * -------
 * • Glass panel with `accent-amber` so border + hover halo are gold
 * • Animated emerald-blue-violet-gold strip at the top edge
 *   (`gradient-flow` keyframes from index.css §Animations)
 * • Gold PDF-icon medallion (left) — visual trophy/anchor
 * • Eyebrow: "INVESTOR DECK · 6 PAGES" — 11px 510 tracking-wide gold
 * • Hero line: "Your **presentation** is ready" — Heading 1 weight
 *   (20–22px 590, -0.288px letter-spacing), with `.gradient-heading`
 *   on the word that matters
 * • Three action buttons on the right (wraps under the hero on
 *   mobile)
 *
 * Pro gating retained: Investor Pro+ for download, Adviser Pro for
 * email + WhatsApp.
 *
 * Props are unchanged — call sites keep working.
 */
import { useState } from 'react';
import { Download, Mail, MessageCircle, Loader2, FileText } from 'lucide-react';
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
      <section
        className="glass-panel accent-amber relative"
        aria-label="Investor presentation actions"
      >
        {/* Animated brand-gradient strip at the very top edge.
            Mirrors the Linear-style accent on Markets headers per
            DESIGN.md §2 / §6 — emerald → cobalt → violet → gold. */}
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, #10E3B0, #4AA8FF, #7B5CFF, #C9A84C, #10E3B0)',
            backgroundSize: '300% 100%',
            animation: 'gradient-flow 8s ease infinite',
            opacity: 0.85,
          }}
        />

        <div className="relative px-5 sm:px-6 py-5 flex flex-col md:flex-row md:items-center gap-5">
          {/* ── Left: trophy medallion + headline ── */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Gold PDF medallion — the visual anchor. Following
                DESIGN.md gold spec: rim ring + soft inner gradient,
                no drop-shadow (DESIGN.md §4: elevation via luminance
                not shadow). */}
            <div className="relative shrink-0">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center ring-1 ring-[#C9A84C]/40"
                style={{
                  background:
                    'radial-gradient(120% 120% at 30% 20%, rgba(201,168,76,0.30) 0%, rgba(201,168,76,0.08) 55%, rgba(201,168,76,0) 100%)',
                }}
              >
                <FileText className="h-6 w-6 text-[#E5C770]" strokeWidth={1.5} />
              </div>
              {/* "PDF" tag tucked into the corner — adds the
                  unmistakable "this is a real document" cue. */}
              <span className="absolute -bottom-1 -right-1 px-1.5 py-px rounded-md text-[8px] font-black tracking-[0.18em] bg-[#C9A84C] text-[#0B1120] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                PDF
              </span>
            </div>

            {/* Eyebrow + hero line */}
            <div className="min-w-0">
              <p
                className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase mb-1.5 text-[#E5C770]"
                style={{ fontWeight: 510, letterSpacing: '0.18em' }}
              >
                <span className="h-1 w-1 rounded-full bg-[#E5C770]" />
                Investor Deck · 6 Pages
              </p>
              <h3
                className="text-[#f7f8f8] leading-[1.15]"
                style={{
                  fontSize: 'clamp(20px, 2.4vw, 24px)',
                  fontWeight: 590,
                  letterSpacing: '-0.288px',
                }}
              >
                Your <span className="gradient-heading">presentation</span> is ready
              </h3>
            </div>
          </div>

          {/* ── Right: action buttons ── */}
          <div className="flex flex-wrap items-center gap-2 md:justify-end shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={disabled || downloading}
              className="gap-1.5 text-xs"
            >
              {downloading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
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
              className="gap-1.5 text-xs text-black shadow-[0_2px_16px_-3px_rgba(37,211,102,0.55)]"
              style={{ background: 'linear-gradient(90deg, #25D366 0%, #128C7E 100%)' }}
            >
              {whatsapping
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <MessageCircle className="h-3.5 w-3.5" />}
              Send via WhatsApp
              {!isAdviserPro && (
                <span className="text-[9px] font-bold text-amber-200 border border-amber-200/30 bg-black/20 px-1 rounded">
                  ADVISER PRO
                </span>
              )}
            </Button>
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
