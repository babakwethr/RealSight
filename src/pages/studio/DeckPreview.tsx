/**
 * DeckPreview — the post-generation deck viewer + publish surface.
 *
 * Route: /studio/decks/:id (AdminRoute).
 *
 * Loads the deck row + adviser profile + tenant, hydrates the
 * lifted runtime Stage, and shows a sticky bottom action bar with:
 *   - Back to composer
 *   - (Phase 1.5) Pick photos — opens VisualsPanel bottom sheet
 *   - Publish → creates a share_links row, shows the short URL
 *
 * Mobile-first: the bottom bar is fixed with safe-area padding,
 * the Stage scales-to-fit on every viewport, and on phones the
 * Stage falls into its stacked-vertical mode (one slide per
 * screen, scroll down through all 10).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Share2, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { Stage } from '@/features/studio/deck-builder/runtime/Stage';
import { HtmlStage, type HtmlSlide } from '@/features/studio/deck-builder/runtime/HtmlStage';
import { CINEMATIC_GOLD_DEFAULT_PHOTOS } from '@/features/studio/deck-builder/runtime/templates/cinematic-gold/stock';
import type {
  OutlineEntry,
  Branding,
  AdviserContact,
  SlideType,
} from '@/features/studio/deck-builder/runtime/types';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';

interface DeckRow {
  id: string;
  tenant_id: string;
  profile_id: string;
  template_slug: string;
  outline: OutlineEntry[] | null;
  html_slides: HtmlSlide[] | null;
  theme: { accent_variant?: string } | null;
  visuals: Record<string, string> | null;
  status: 'draft' | 'published' | 'archived';
  share_token: string | null;
  slug: string | null;
  topic: string | null;
}

export default function DeckPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [deck, setDeck] = useState<DeckRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [adviser, setAdviser] = useState<AdviserContact | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Load deck ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('studio_decks')
        .select(
          'id, tenant_id, profile_id, template_slug, outline, html_slides, theme, visuals, status, share_token, slug, topic',
        )
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        toast.error('Deck not found');
        navigate('/studio');
        return;
      }
      setDeck(data as DeckRow);
      if (data.share_token) {
        // Already published — surface the short URL.
        const { data: link } = await supabase
          .from('share_links')
          .select('id')
          .eq('target_url', `spa:/p/${data.share_token}`)
          .maybeSingle();
        if (link?.id) {
          setPublishedUrl(`${window.location.origin}/r/${link.id}`);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // ── Load adviser contact (for closing slide) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, title, phone, whatsapp, calendar_url, avatar_url, rera_number')
        .eq('user_id', user.id)
        .single();
      if (cancelled || !data) return;
      setAdviser({
        full_name: data.full_name ?? 'Adviser',
        title: data.title ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        whatsapp: data.whatsapp ?? undefined,
        calendar_url: data.calendar_url ?? undefined,
        avatar_url: data.avatar_url ?? undefined,
        rera_number: data.rera_number ?? undefined,
        rera_qr_url: tenant?.rera_qr_url ?? undefined,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tenant?.rera_qr_url]);

  const branding: Branding = {
    logo_url: tenant?.branding_config?.logo_url,
    accent_color: tenant?.branding_config?.colors?.primary,
    agency_name: tenant?.broker_name ?? undefined,
  };

  // Merge per-slide visual overrides with template default photos.
  const visuals: Record<string, string> = (() => {
    const out: Record<string, string> = {};
    deck?.outline?.forEach((entry, i) => {
      const override = deck?.visuals?.[String(i)] ?? deck?.visuals?.[entry.slide_type];
      if (override) {
        out[String(i)] = override;
      } else {
        const fallback = CINEMATIC_GOLD_DEFAULT_PHOTOS[entry.slide_type as SlideType];
        if (fallback) out[String(i)] = fallback;
      }
    });
    return out;
  })();

  const onPublish = async () => {
    if (!deck) return;
    setPublishing(true);
    try {
      // 1. Generate share_token if not present.
      let shareToken = deck.share_token;
      let slug = deck.slug;
      if (!shareToken) {
        shareToken = generateToken();
        slug = slugify(deck.topic ?? `deck-${deck.id.slice(0, 6)}`);
      }

      // 2. Update deck → published.
      const { error: updateError } = await supabase
        .from('studio_decks')
        .update({ status: 'published', share_token: shareToken, slug })
        .eq('id', deck.id);
      if (updateError) throw new Error(updateError.message);

      // 3. Insert share_links row → /r/{shortId} resolves to /p/{shareToken}.
      const shortId = generateShortId();
      const { error: linkError } = await supabase
        .from('share_links')
        .insert({
          id: shortId,
          target_url: `spa:/p/${shareToken}`,
        });
      if (linkError) {
        // If the schema for share_links requires more columns, fall back
        // to direct /p/ URL.
        console.warn('[DeckPreview] share_links insert failed', linkError);
        const directUrl = `${window.location.origin}/p/${shareToken}`;
        setPublishedUrl(directUrl);
        void mediumTap();
        toast.success('Deck published', {
          description: 'Your share link is ready.',
        });
        return;
      }

      const url = `${window.location.origin}/r/${shortId}`;
      setPublishedUrl(url);
      void mediumTap();
      toast.success('Deck published', {
        description: 'Your share link is ready to copy.',
      });
      // Reflect status locally so the UI swaps to "Published" affordance.
      setDeck({ ...deck, status: 'published', share_token: shareToken, slug });
    } catch (err) {
      toast.error('Could not publish', { description: (err as Error).message });
    } finally {
      setPublishing(false);
    }
  };

  const onCopyLink = async () => {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      void lightTap();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copy failed — long-press the link instead.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white/55">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading your deck…
      </div>
    );
  }
  if (!deck) return null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0b]">
      {/* Top bar */}
      <header className="z-20 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#07040F]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <button
          type="button"
          onClick={() => navigate(`/studio/presentation?deck=${deck.id}&step=publish`)}
          className="inline-flex items-center gap-1.5 rounded-full text-xs font-bold text-white/55 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to composer
        </button>
        <div className="hidden text-[11px] uppercase tracking-[0.18em] text-white/45 sm:block">
          {deck.outline?.length ?? 0} slides · {deck.template_slug}
        </div>
        <div className="rounded-full bg-[#18d6a4]/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#18d6a4]">
          {deck.status === 'published' ? 'Published' : 'Draft'}
        </div>
      </header>

      {/* Stage — takes the remaining space. Hidden bottom padding so
          the floating action bar doesn't sit on top of the last slide. */}
      <div className="relative flex-1 overflow-hidden">
        {deck.html_slides && deck.html_slides.length > 0 ? (
          <HtmlStage
            templateSlug={deck.template_slug}
            accentVariant={deck.theme?.accent_variant}
            slides={deck.html_slides}
            branding={branding}
            adviser={adviser ?? undefined}
            visuals={visuals}
            enableFullscreenOnFirstTap={false}
            showChrome={true}
          />
        ) : (
          <Stage
            templateSlug={deck.template_slug}
            outline={deck.outline ?? []}
            visuals={visuals}
            branding={branding}
            adviser={adviser ?? undefined}
            enableFullscreenOnFirstTap={false}
            showChrome={true}
          />
        )}
      </div>

      {/* Bottom action bar — fixed on mobile, sticky on desktop. */}
      <footer
        className="z-30 border-t border-white/[0.08] bg-[#07040F]/95 px-4 py-3 backdrop-blur-xl sm:px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 12px)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled
            title="Photo picker arrives in the next build"
            className="h-12 rounded-full px-4 text-sm font-bold text-white/45"
          >
            <ImageIcon className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Photos</span>
          </Button>

          {publishedUrl ? (
            <button
              type="button"
              onClick={onCopyLink}
              className={cn(
                'flex h-12 flex-1 items-center justify-between gap-2 rounded-full border px-4 text-sm font-bold transition-colors',
                copied
                  ? 'border-[#18d6a4]/45 bg-[#18d6a4]/12 text-[#18d6a4]'
                  : 'border-white/[0.12] bg-white/[0.04] text-white/85 hover:border-white/[0.24]',
              )}
            >
              <span className="truncate font-mono text-xs sm:text-[13px]">
                {publishedUrl.replace(/^https?:\/\//, '')}
              </span>
              {copied ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <Copy className="h-4 w-4 shrink-0" />
              )}
            </button>
          ) : (
            <Button
              type="button"
              onClick={onPublish}
              disabled={publishing}
              className={cn(
                'h-12 flex-1 max-w-[260px] rounded-full px-5 text-sm font-black transition-all',
                'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
                'disabled:opacity-40 disabled:translate-y-0',
              )}
            >
              {publishing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Publish & share link
                </span>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function generateToken(): string {
  // 22-char URL-safe random token (RFC4648 base64url, no padding).
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateShortId(): string {
  // 12-char lowercase-alphanumeric (matches the deal-share pattern).
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const out: string[] = [];
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) out.push(chars[bytes[i] % chars.length]);
  return out.join('');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
