import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * AI consent / disclosure gate.
 *
 * Apple App Store Guideline 5.1.2(i) (enforced since Nov 2025) and Google
 * Play data-safety rules require that, before any personal data is shared
 * with an external AI provider, the app shows a consent screen that (a)
 * NAMES the AI provider and (b) states the data is sent there for
 * processing. No disclosure = automatic store rejection.
 *
 * RealSight routes AI features (Deal Analyzer, AI Concierge, Studio Deck
 * Builder) through Google Gemini, so we must disclose Google as the
 * processor and obtain explicit consent before first use.
 *
 * This renders once for an authenticated user (mounted in AppLayout). The
 * grant is stored in localStorage so it isn't shown again on the device.
 * Bumping CONSENT_KEY re-prompts everyone (use if the disclosure changes).
 *
 * NOTE: This is the single place we are *required* to name a vendor.
 * RealSight's "no vendor names in customer-visible UI" rule still applies
 * to media-generation tools — this legally-required AI-processing
 * disclosure is the deliberate exception.
 */
const CONSENT_KEY = 'rs_ai_consent_v1';

export function hasAiConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) != null;
  } catch {
    return false;
  }
}

export function AiConsentDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasAiConsent()) {
      // Defer one tick so it doesn't fight the page's mount animation.
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, []);

  const grant = () => {
    try {
      localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    } catch {
      /* private mode — consent still granted for this session */
    }
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md border-white/10 bg-[#0b0e1c]/95 backdrop-blur-xl">
        <AlertDialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background:
                  'linear-gradient(135deg, rgba(46,255,192,0.22), rgba(106,92,255,0.22))',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Sparkles className="h-5 w-5 text-[#2effc0]" />
            </span>
            <AlertDialogTitle className="text-lg">How RealSight uses AI</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm leading-relaxed text-white/70">
              <p>
                Features like the Deal Analyzer, AI Concierge and Studio use{' '}
                <span className="font-semibold text-white/90">Google Gemini</span> to
                generate their analysis.
              </p>
              <p>
                When you use these features, the text and files you provide are sent to
                Google for processing. We don&apos;t sell your data or use it to train
                public AI models.
              </p>
              <p className="text-white/55">
                Full detail is in our{' '}
                <Link
                  to="/privacy"
                  className="text-[#2effc0] underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogAction
            onClick={grant}
            className="w-full bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] font-bold text-[#0a0814] hover:opacity-90"
          >
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Agree &amp; continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
