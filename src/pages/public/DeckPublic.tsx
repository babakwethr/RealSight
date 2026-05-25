/**
 * DeckPublic — public, no-auth deck viewer at `/p/:shareToken`.
 *
 * Resolves the deck row by share_token (RLS allows public SELECT on
 * status='published' rows), hydrates the same Stage as the editor
 * preview, and auto-enters fullscreen on the first tap so the
 * recipient gets a presentation experience, not a browser tab.
 *
 * Mounted OUTSIDE AppLayout / AdminRoute so there's no app chrome
 * around the deck — clean cinematic landing on the share link.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Stage } from '@/features/studio/deck-builder/runtime/Stage';
import { CINEMATIC_GOLD_DEFAULT_PHOTOS } from '@/features/studio/deck-builder/runtime/templates/cinematic-gold/stock';
import { Logo } from '@/components/Logo';
import type {
  OutlineEntry,
  Branding,
  AdviserContact,
  SlideType,
} from '@/features/studio/deck-builder/runtime/types';

interface PublicDeck {
  id: string;
  tenant_id: string;
  profile_id: string;
  template_slug: string;
  outline: OutlineEntry[] | null;
  visuals: Record<string, string> | null;
  topic: string | null;
}

interface PublicProfile {
  full_name: string | null;
  email: string | null;
  title: string | null;
  phone: string | null;
  whatsapp: string | null;
  calendar_url: string | null;
  avatar_url: string | null;
  rera_number: string | null;
}

interface PublicTenant {
  broker_name: string | null;
  branding_config: { logo_url?: string; colors?: { primary?: string } } | null;
  rera_qr_url: string | null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'ready'; deck: PublicDeck; adviser: AdviserContact; branding: Branding };

export default function DeckPublic() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shareToken) {
        setState({ kind: 'not_found' });
        return;
      }
      const { data: deck, error } = await supabase
        .from('studio_decks')
        .select('id, tenant_id, profile_id, template_slug, outline, visuals, topic, status')
        .eq('share_token', shareToken)
        .eq('status', 'published')
        .maybeSingle();
      if (cancelled) return;
      if (error || !deck) {
        setState({ kind: 'not_found' });
        return;
      }
      // Two parallel fetches: adviser profile + tenant branding.
      const [{ data: profile }, { data: tenant }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email, title, phone, whatsapp, calendar_url, avatar_url, rera_number')
          .eq('id', deck.profile_id)
          .maybeSingle(),
        supabase
          .from('tenants')
          .select('broker_name, branding_config, rera_qr_url')
          .eq('id', deck.tenant_id)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const p = (profile ?? {}) as Partial<PublicProfile>;
      const t = (tenant ?? {}) as Partial<PublicTenant>;

      setState({
        kind: 'ready',
        deck: deck as PublicDeck,
        adviser: {
          full_name: p.full_name ?? 'Adviser',
          title: p.title ?? undefined,
          email: p.email ?? undefined,
          phone: p.phone ?? undefined,
          whatsapp: p.whatsapp ?? undefined,
          calendar_url: p.calendar_url ?? undefined,
          avatar_url: p.avatar_url ?? undefined,
          rera_number: p.rera_number ?? undefined,
          rera_qr_url: t.rera_qr_url ?? undefined,
        },
        branding: {
          logo_url: t.branding_config?.logo_url,
          accent_color: t.branding_config?.colors?.primary,
          agency_name: t.broker_name ?? undefined,
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] p-6">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <Logo variant="white" className="h-7 w-auto" />
          </div>
          <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#18d6a4]" />
          <p className="text-sm font-semibold text-white/85">Loading deck…</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] p-6">
        <div className="max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <Logo variant="white" className="h-7 w-auto" />
          </div>
          <p className="mb-2 text-lg font-bold text-amber-300">
            Deck not found
          </p>
          <p className="text-sm leading-relaxed text-white/60">
            This share link is no longer valid or the deck has been
            unpublished. Please ask the sender for a fresh link.
          </p>
          <a
            href="/"
            className="mt-6 inline-block text-sm font-semibold text-[#18d6a4] transition-colors hover:text-[#2effc0]"
          >
            Visit RealSight →
          </a>
        </div>
      </div>
    );
  }

  const { deck, adviser, branding } = state;

  // Merge per-slide visual overrides with template default photos.
  const visuals: Record<string, string> = (() => {
    const out: Record<string, string> = {};
    deck.outline?.forEach((entry, i) => {
      const override = deck.visuals?.[String(i)] ?? deck.visuals?.[entry.slide_type];
      if (override) {
        out[String(i)] = override;
      } else {
        const fallback = CINEMATIC_GOLD_DEFAULT_PHOTOS[entry.slide_type as SlideType];
        if (fallback) out[String(i)] = fallback;
      }
    });
    return out;
  })();

  return (
    <Stage
      templateSlug={deck.template_slug}
      outline={deck.outline ?? []}
      visuals={visuals}
      branding={branding}
      adviser={adviser}
      enableFullscreenOnFirstTap={true}
      showChrome={true}
    />
  );
}
