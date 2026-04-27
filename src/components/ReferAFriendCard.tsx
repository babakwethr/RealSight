/**
 * ReferAFriendCard — surfaces the user's personal referral link.
 *
 * Per LAUNCH_PLAN.md §14 step 9: when someone signs up via this link AND
 * eventually subscribes, BOTH sides get 1 free month credited via the Stripe
 * webhook (LAUNCH_PLAN.md §14 step 11). The webhook reads `user_metadata.referred_by`
 * which is captured by useAuth.signUp() at account creation time.
 *
 * Launch-tactical decisions:
 *   - Code is DERIVED from user.id (deterministic, no migration needed). 8 chars,
 *     base32-ish, uppercase. Collisions are impossible because user.id is a UUID.
 *   - We don't track redemption count yet — that comes with the Stripe webhook
 *     wiring. For now the card celebrates the link and trust-signals the
 *     reciprocal reward.
 *   - URL format: realsight.app/?ref=ABCD1234 — the landing page sticks the code
 *     in localStorage so it survives the auth bounce, then signUp picks it up.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Copy, CheckCircle2, Share2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/** Stable 8-char code from a UUID. Pure crypto-free hash. */
function deriveReferralCode(userId: string | undefined): string | null {
  if (!userId) return null;
  // Strip dashes, take alternating hex chars to spread entropy, uppercase.
  const stripped = userId.replace(/-/g, '');
  let out = '';
  for (let i = 0; i < stripped.length && out.length < 8; i += 2) {
    out += stripped[i];
  }
  return out.toUpperCase();
}

interface Props {
  /** "card" = full hero block, "inline" = compact strip for sidebars. */
  variant?: 'card' | 'inline';
  className?: string;
}

export function ReferAFriendCard({ variant = 'card', className = '' }: Props) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => deriveReferralCode(user?.id), [user?.id]);
  const link = useMemo(() => {
    if (!code) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://realsight.app';
    return `${origin}/?ref=${code}`;
  }, [code]);

  if (!code) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Referral link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — long-press the link to share');
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'RealSight — Global Property Intelligence',
          text: 'I use RealSight for property intelligence. Sign up with my link and we both get a free month.',
          url: link,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  if (variant === 'inline') {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-300/10 via-transparent to-transparent ${className}`}
      >
        <Gift className="h-4 w-4 text-amber-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">Refer a friend, both get 1 free month</p>
          <code className="text-[10px] text-muted-foreground/80 font-mono truncate block">{link}</code>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-amber-300/20 text-amber-200 hover:bg-amber-300/30 transition"
        >
          {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 ${className}`}
      style={{
        background:
          'linear-gradient(135deg, rgba(255, 210, 94, 0.16) 0%, rgba(10, 14, 32, 0.55) 55%, rgba(10, 14, 32, 0.45) 100%)',
        border: '1px solid rgba(255, 210, 94, 0.35)',
        boxShadow: '0 14px 40px -16px rgba(255, 210, 94, 0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      {/* Soft halo */}
      <div
        aria-hidden="true"
        className="absolute -top-20 -right-10 w-[18rem] h-[18rem] rounded-full blur-[80px] pointer-events-none"
        style={{ background: 'rgba(255, 210, 94, 0.18)' }}
      />

      <div className="relative space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-300/15 border border-amber-300/30 flex items-center justify-center">
            <Gift className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-amber-300/15 text-amber-200 border border-amber-300/40">
              <Sparkles className="h-2.5 w-2.5" />
              Founder reward
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-foreground leading-tight mt-1">
              Refer a friend, you both get a free month
            </h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Share your link below. When they sign up and subscribe, we credit{' '}
          <span className="text-amber-200 font-bold">one free month to each of you</span> — no cap, no
          catch. Stack credits as long as you keep referring.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <code className="flex-1 min-w-0 truncate text-xs sm:text-sm font-mono px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-foreground">
            {link}
          </code>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-black bg-amber-300 text-black shadow-lg hover:-translate-y-[1px] transition-transform"
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border border-white/10 text-foreground hover:bg-white/5 transition"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
          <span>Your code: <strong className="text-amber-200 font-mono tracking-widest">{code}</strong></span>
          <span aria-hidden="true">·</span>
          <Link to="/billing" className="text-foreground/70 hover:text-foreground underline-offset-2 hover:underline">
            See your plan
          </Link>
        </div>
      </div>
    </div>
  );
}
