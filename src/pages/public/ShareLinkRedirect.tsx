/**
 * ShareLinkRedirect — public landing for `/r/:id` short URLs.
 *
 * Background: when an adviser hits "Send via WhatsApp" on a Deal
 * Analyzer result, we upload the PDF to Supabase Storage and create a
 * row in the `share_links` table with a 12-char id. The WhatsApp
 * message contains `https://www.realsight.app/r/{id}` instead of the
 * raw 200-char Supabase URL.
 *
 * When the recipient clicks the link, the SPA loads, this component
 * mounts, queries the `share_links` row by id (RLS allows public
 * SELECT — the id itself is the access token), and `window.location
 * .replace()` to the underlying public-bucket URL. The PDF opens in
 * the browser's PDF viewer.
 *
 * Side-effect of going through the SPA: the recipient briefly sees a
 * RealSight-branded "Loading your report…" screen, which is good free
 * marketing. The redirect typically lands inside ~1 second.
 *
 * Failure modes:
 *   • Unknown id     → friendly "link expired or invalid" page.
 *   • Expired (>90d) → same page.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';

type State =
  | { kind: 'loading' }
  | { kind: 'redirecting'; url: string }
  | { kind: 'not_found' };

export default function ShareLinkRedirect() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id || !/^[A-Za-z0-9_-]{6,40}$/.test(id)) {
        if (!cancelled) setState({ kind: 'not_found' });
        return;
      }
      const { data, error } = await supabase
        .from('share_links')
        .select('target_url, expires_at')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setState({ kind: 'not_found' }); return; }
      if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        setState({ kind: 'not_found' });
        return;
      }
      // Best-effort hit-counter — never blocks the redirect.
      supabase.rpc('increment_share_link_count' as any, { p_id: id }).catch(() => {});
      setState({ kind: 'redirecting', url: data.target_url });
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Imperatively redirect once we have the URL — useEffect would also
  // fire after StrictMode's double-mount, so guard with state.kind.
  useEffect(() => {
    if (state.kind === 'redirecting') {
      window.location.replace(state.url);
    }
  }, [state]);

  return (
    <div className="min-h-screen cinematic-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="white" className="h-7 w-auto" />
        </div>
        {state.kind !== 'not_found' ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-[#18d6a4] mx-auto mb-5" />
            <p className="text-white/85 font-semibold text-base mb-1">
              Loading your report…
            </p>
            <p className="text-white/45 text-[13px]">
              Opening the PDF in a moment.
            </p>
          </>
        ) : (
          <>
            <p className="text-amber-300 font-bold text-lg mb-2">
              Link expired or not found
            </p>
            <p className="text-white/60 text-sm leading-relaxed">
              This share link is no longer valid. Please ask the person who sent it to generate a new report.
            </p>
            <a
              href="/"
              className="inline-block mt-6 text-[#18d6a4] hover:text-[#2effc0] text-sm font-semibold transition-colors"
            >
              Visit RealSight →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
