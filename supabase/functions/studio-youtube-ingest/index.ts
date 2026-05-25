/**
 * studio-youtube-ingest — extract a public YouTube video's
 * transcript and persist it as a `studio_assets` row of kind
 * `youtube_transcript`. The studio-deck-plan orchestrator then
 * reads that row via `fetch_youtube_transcript(asset_id)`.
 *
 * Contract:
 *   IN  POST { youtube_url: string, deck_id?: string }
 *   OUT 200 { asset_id: string, video_id: string, char_count: number }
 *   OUT 422 { error: 'no_captions' | 'private_video' | ... }
 *
 * Auth: gateway verify_jwt=true (adviser-only Studio tool).
 *
 * Implementation: youtube-transcript via npm: import. If a video
 * has no captions or is private, we return a 422 with a specific
 * error code so the composer can show a useful toast.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { YoutubeTranscript } from 'npm:youtube-transcript@1.2.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IngestRequest {
  youtube_url: string;
  deck_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ─────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized — please log in' }, 401);
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: 'Unauthorized — invalid session' }, 401);
    }
    const userId = userData.user.id;

    // ── Resolve profile + tenant ────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, tenant_id')
      .eq('user_id', userId)
      .single();
    if (profileError || !profile?.tenant_id) {
      return json({ error: 'Profile not found or tenantless' }, 403);
    }

    // ── Parse + validate ────────────────────────────────────
    const body = (await req.json()) as IngestRequest;
    if (!body.youtube_url || typeof body.youtube_url !== 'string') {
      return json({ error: 'Missing youtube_url' }, 400);
    }
    const videoId = extractVideoId(body.youtube_url.trim());
    if (!videoId) {
      return json(
        { error: 'invalid_url', detail: 'Could not find a YouTube video ID in that URL.' },
        400,
      );
    }

    // ── Fetch transcript ────────────────────────────────────
    let segments: Array<{ text: string }>;
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en',
      });
    } catch (err) {
      const msg = String(err);
      console.warn('[studio-youtube-ingest] fetchTranscript failed', videoId, msg);
      // Common youtube-transcript error messages:
      //   "Could not get transcripts" → no captions
      //   "Video unavailable"          → private / removed
      if (/no transcript|disabled|could not find|not available/i.test(msg)) {
        return json(
          { error: 'no_captions', detail: 'This video does not have captions available.' },
          422,
        );
      }
      if (/private|unavailable/i.test(msg)) {
        return json(
          { error: 'private_video', detail: 'This video is private or has been removed.' },
          422,
        );
      }
      return json({ error: 'transcript_failed', detail: msg }, 502);
    }

    const fullText = segments
      .map((s) => s.text?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
      .slice(0, 200_000); // hard cap, never store a novel

    if (!fullText) {
      return json({ error: 'empty_transcript' }, 422);
    }

    // ── Insert studio_assets row ────────────────────────────
    const { data: asset, error: insertError } = await supabase
      .from('studio_assets')
      .insert({
        tenant_id: profile.tenant_id,
        profile_id: profile.id,
        deck_id: body.deck_id ?? null,
        kind: 'youtube_transcript',
        source_url: body.youtube_url,
        extracted_text: fullText,
      })
      .select('id')
      .single();

    if (insertError || !asset) {
      console.error('[studio-youtube-ingest] insert failed', insertError);
      return json(
        { error: 'db_insert_failed', detail: insertError?.message },
        500,
      );
    }

    return json(
      {
        asset_id: asset.id,
        video_id: videoId,
        char_count: fullText.length,
      },
      200,
    );
  } catch (err) {
    console.error('[studio-youtube-ingest] uncaught', err);
    return json({ error: (err as Error)?.message ?? 'Internal error' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Extract a video ID from common YouTube URL shapes:
 *   https://www.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://m.youtube.com/watch?v=ID
 *   https://www.youtube.com/shorts/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/live/ID
 * Plus the bare 11-char ID.
 */
function extractVideoId(input: string): string | null {
  // Bare ID.
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').slice(0, 11);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com') {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const segMatch = url.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
      if (segMatch) return segMatch[1];
    }
  } catch {
    /* not a URL */
  }
  return null;
}
