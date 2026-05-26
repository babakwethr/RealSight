/**
 * studio-deck-plan — Studio Deck Builder LLM orchestrator (V2,
 * generative HTML).
 *
 * V1 emitted a structured outline (one of 10 fixed slide types
 * with typed `data` fields) and a fixed set of React slide
 * components rendered it. Every deck looked like the same template
 * with the text swapped out.
 *
 * V2 — what Babak asked for: the LLM emits THE FULL HTML+CSS BODY
 * for each slide, scoped to the chosen template's CSS variables.
 * Each deck is a unique HTML document. The renderer (`HtmlStage`)
 * mounts via `dangerouslySetInnerHTML` against pre-sanitised text.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  geminiFunctionDeclarations,
  findStudioTool,
  type ToolContext,
} from '../_shared/studioTools.ts';
import { sanitizeSlideHtml } from '../_shared/htmlSanitize.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_TOOL_ITERATIONS = 8;
const MIN_SLIDES = 4;
const MAX_SLIDES = 10;

interface PlanRequest {
  topic: string;
  audience?: string;
  voice_notes?: string;
  contact_bg_prompt?: string;
  reference_asset_ids?: string[];
  template_slug?: string;
  deck_id?: string;
  mode?: 'plan' | 'refine';
  refine_instruction?: string;
}

interface HtmlSlide {
  id: string;
  type_hint: string;
  html: string;
  citation?: unknown;
}

interface ThemeOut {
  accent_variant?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized — please log in' }, 401);
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized — invalid session' }, 401);
    }
    const userId = userData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, tenant_id, full_name, email')
      .eq('user_id', userId)
      .single();
    if (profileError || !profile) {
      return jsonResponse({ error: 'No profile for this user.' }, 403);
    }
    if (!profile.tenant_id) {
      return jsonResponse({ error: 'Adviser is not attached to a tenant.' }, 403);
    }

    const body = (await req.json()) as PlanRequest;
    if (!body.topic || body.topic.trim().length < 8) {
      return jsonResponse({ error: 'Topic must be at least 8 characters.' }, 400);
    }
    if (body.topic.length > 1024) {
      return jsonResponse({ error: 'Topic too long (max 1024 chars).' }, 413);
    }
    const templateSlug = body.template_slug ?? 'cinematic-gold';

    let deckId = body.deck_id;
    if (!deckId) {
      const { data: deck, error: insertError } = await supabase
        .from('studio_decks')
        .insert({
          tenant_id: profile.tenant_id,
          profile_id: profile.id,
          template_slug: templateSlug,
          topic: body.topic,
          audience: body.audience ?? null,
          brief: {
            topic: body.topic,
            audience: body.audience,
            voice_notes: body.voice_notes,
            contact_bg_prompt: body.contact_bg_prompt,
            reference_asset_ids: body.reference_asset_ids ?? [],
          },
          status: 'draft',
        })
        .select('id')
        .single();
      if (insertError || !deck) {
        return jsonResponse({ error: `Could not create draft: ${insertError?.message}` }, 500);
      }
      deckId = deck.id as string;
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return jsonResponse({ error: 'AI service not configured' }, 500);
    }
    const primaryModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    // Fallback when the primary model returns 429 quota exhausted —
    // gemini-2.5-flash-lite has separate per-minute throughput on the
    // same Google AI Studio project, so it often succeeds when
    // gemini-2.5-flash is rate-limited. Daily-quota exhaustion still
    // blocks both, but per-minute spikes get rescued.
    const fallbackModel =
      Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-2.5-flash-lite';
    const buildApiUrl = (m: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
    let currentModel = primaryModel;
    let usedFallback = false;

    // Refine mode: load the existing slides so the LLM has the prior
    // state to preserve. Without this it tends to emit only the slide
    // it was asked to change and drop the rest of the deck.
    let existingSlides: HtmlSlide[] = [];
    if (body.mode === 'refine' && deckId) {
      const { data: prior } = await supabase
        .from('studio_decks')
        .select('html_slides')
        .eq('id', deckId)
        .maybeSingle();
      if (prior?.html_slides && Array.isArray(prior.html_slides)) {
        existingSlides = prior.html_slides as HtmlSlide[];
      }
    }

    const systemPrompt = buildSystemPrompt({
      audience: body.audience,
      mode: body.mode ?? 'plan',
      templateSlug,
      hasExistingSlides: existingSlides.length > 0,
    });
    const userMessage = buildUserMessage(body, profile, templateSlug, existingSlides);

    const contents: Array<Record<string, unknown>> = [
      { role: 'user', parts: [{ text: userMessage }] },
    ];
    // Plan mode needs DLD tool-calls; refine mode already has the cited
    // data baked into existing slides, so we omit the tool catalogue to
    // shrink the request and remove a class of failure modes (function-
    // call loops over a deck that's already finished). The orchestrator
    // loop still handles tool-calls if Gemini emits them.
    const includeTools = (body.mode ?? 'plan') === 'plan';
    const tools = includeTools
      ? [{ functionDeclarations: geminiFunctionDeclarations() }]
      : undefined;
    const citationsByCallSig: Record<string, {
      tool: string;
      params: Record<string, unknown>;
      rows: number;
      fetched_at: string;
      source: string;
      window?: string;
    }> = {};
    let finalText = '';
    const ctx: ToolContext = {
      supabase,
      userId,
      tenantId: profile.tenant_id as string,
      profileId: profile.id as string,
      deckId,
    };

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      // Refine mode emits the full deck verbatim (10 long HTML slides),
      // so it needs more output budget than plan mode. Plan mode also
      // benefits from thinking-on for the data-call planning.
      const isRefine = (body.mode ?? 'plan') === 'refine';
      const requestBody: Record<string, unknown> = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: isRefine ? 0.5 : 0.55,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: isRefine ? 60000 : 32768,
          responseMimeType: 'text/plain',
          // Disable thinking on refine — we're just rewriting HTML,
          // not planning data-calls. Thinking eats into the same output
          // budget on 2.5-flash and we need every token for the deck.
          ...(isRefine ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      };
      if (tools) requestBody.tools = tools;
      console.log(
        `[studio-deck-plan] iter=${iter} mode=${body.mode ?? 'plan'} ` +
          `system_prompt_chars=${systemPrompt.length} ` +
          `contents_count=${contents.length} ` +
          `user_msg_chars=${userMessage.length} ` +
          `tools=${tools ? 'on' : 'off'}`,
      );
      // Call with transient-failure retry — handles both 429 (quota
      // exhausted, try fallback model) and 503 (Gemini service
      // overloaded, retry same model with backoff). Up to 3 attempts
      // total per orchestrator iteration.
      const upstream = await callGeminiWithRetry({
        primaryModel: currentModel,
        fallbackModel,
        body: requestBody,
        buildApiUrl,
        onFallback: () => {
          usedFallback = true;
          currentModel = fallbackModel;
        },
      });
      if (!upstream.ok) {
        const errText = await upstream.text();
        console.error(
          '[studio-deck-plan] Gemini error',
          upstream.status,
          errText.slice(0, 800),
        );
        if (upstream.status === 429) {
          return jsonResponse(
            {
              error:
                "You've hit today's free-tier limit on Gemini. Enable billing at aistudio.google.com/app/apikey (takes ~60 seconds, costs cents per deck) or wait until midnight UTC.",
              details: errText.slice(0, 300),
              code: 'quota_exhausted',
            },
            200,
          );
        }
        if (upstream.status === 503 || upstream.status === 502 || upstream.status === 504) {
          return jsonResponse(
            {
              error:
                "Gemini is overloaded right now — Google's side, not yours. Try again in 30–60 seconds. This happens during US-hours spikes.",
              details: errText.slice(0, 300),
              code: 'service_overloaded',
            },
            200,
          );
        }
        return jsonResponse(
          {
            error: `AI service error (HTTP ${upstream.status})`,
            details: errText.slice(0, 600),
            iter,
            mode: body.mode ?? 'plan',
            model: currentModel,
          },
          200,
        );
      }
      const data = await upstream.json();
      const candidate = data.candidates?.[0];
      const parts: Array<Record<string, unknown>> = candidate?.content?.parts ?? [];

      const functionCalls = parts.filter((p) => p.functionCall);
      contents.push({ role: 'model', parts });

      if (functionCalls.length === 0) {
        finalText = parts
          .map((p) => (typeof p.text === 'string' ? p.text : ''))
          .join('');
        break;
      }

      const functionResponseParts: Array<Record<string, unknown>> = [];
      for (const part of functionCalls) {
        const fc = part.functionCall as { name: string; args?: Record<string, unknown> };
        const tool = findStudioTool(fc.name);
        if (!tool) {
          functionResponseParts.push({
            functionResponse: { name: fc.name, response: { error: `Unknown tool: ${fc.name}` } },
          });
          continue;
        }
        try {
          const result = await tool.fn(fc.args ?? {}, ctx);
          const citation = {
            tool: tool.name,
            params: fc.args ?? {},
            rows: result.rows,
            fetched_at: new Date().toISOString(),
            source: tool.source,
            window: result.window,
          };
          const sig = `${tool.name}:${stableStringify(fc.args ?? {})}`;
          citationsByCallSig[sig] = citation;
          functionResponseParts.push({
            functionResponse: {
              name: fc.name,
              response: { data: result.data, rows: result.rows, _citation_sig: sig },
            },
          });
        } catch (err) {
          functionResponseParts.push({
            functionResponse: { name: fc.name, response: { error: String(err) } },
          });
        }
      }
      contents.push({ role: 'function', parts: functionResponseParts });
    }

    if (!finalText) {
      return jsonResponse({ error: 'AI did not return a final response (loop exhausted).' }, 200);
    }

    const parsed = parseDeckJson(finalText);
    if (!parsed || !Array.isArray((parsed as { html_slides?: unknown }).html_slides)) {
      return jsonResponse(
        {
          error: 'The AI could not produce a valid deck. Try again, or sharpen the topic.',
          raw: finalText.slice(0, 500),
        },
        200,
      );
    }

    let slides = (parsed as { html_slides: HtmlSlide[] }).html_slides;
    if (slides.length > MAX_SLIDES) slides = slides.slice(0, MAX_SLIDES);
    let cleanSlides: HtmlSlide[] = slides.map((s, i) => {
      const sig = (s as { _citation_sig?: string })._citation_sig;
      const citation = sig && citationsByCallSig[sig] ? citationsByCallSig[sig] : undefined;
      return {
        id: typeof s.id === 'string' && s.id.length > 0 ? s.id : `slide-${i + 1}`,
        type_hint: typeof s.type_hint === 'string' ? s.type_hint : 'generic',
        html: sanitizeSlideHtml(s.html),
        citation,
      };
    });

    // Refine merge — if the LLM returned fewer slides than the prior
    // deck has, treat it as a partial update: replace by id where it
    // emitted a new version, keep the existing ones for the rest. The
    // refine instruction often targets one slide and the LLM emits
    // only that, dropping the rest. Without this merge the user loses
    // their deck.
    if (
      body.mode === 'refine' &&
      existingSlides.length > 0 &&
      cleanSlides.length < existingSlides.length
    ) {
      const byId = new Map<string, HtmlSlide>();
      for (const s of existingSlides) byId.set(s.id, s);
      for (const s of cleanSlides) byId.set(s.id, s);
      const ordered: HtmlSlide[] = [];
      const seen = new Set<string>();
      for (const orig of existingSlides) {
        const merged = byId.get(orig.id);
        if (merged) {
          ordered.push(merged);
          seen.add(orig.id);
        }
      }
      for (const s of cleanSlides) {
        if (!seen.has(s.id)) ordered.push(s);
      }
      cleanSlides = ordered;
      console.log(
        `[studio-deck-plan] refine merge — existing=${existingSlides.length} returned=${slides.length} final=${cleanSlides.length}`,
      );
    }

    if (cleanSlides.length < MIN_SLIDES) {
      return jsonResponse(
        { error: `Only ${cleanSlides.length} slides produced (minimum ${MIN_SLIDES}). Try a more specific topic.` },
        200,
      );
    }

    const themeRaw = (parsed as { theme?: { accent_variant?: string } }).theme;
    const theme: ThemeOut = {
      accent_variant:
        themeRaw && typeof themeRaw.accent_variant === 'string'
          ? themeRaw.accent_variant
          : 'default',
    };

    const { error: updateError } = await supabase
      .from('studio_decks')
      .update({
        html_slides: cleanSlides,
        theme,
        outline: [],
        last_data_refresh_at: new Date().toISOString(),
      })
      .eq('id', deckId);
    if (updateError) {
      console.error('[studio-deck-plan] DB update failed', updateError);
    }

    return jsonResponse({ deck_id: deckId, html_slides: cleanSlides, theme }, 200);
  } catch (err) {
    console.error('[studio-deck-plan] uncaught', err);
    return jsonResponse({ error: (err as Error)?.message ?? 'Internal error' }, 200);
  }
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(
    keys.reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {}),
  );
}

function templateGuide(slug: string): string {
  switch (slug) {
    case 'cinematic-gold':
      return 'Cinematic Gold — warm, atmospheric, golden-hour photography. Big display serif headlines (Cormorant Garamond). Slow Ken-Burns motion. Generous negative space. Italic gold accent on key phrases.';
    case 'architectural-bold':
      return 'Architectural Bold — high contrast, hard cuts, monumental serif (Playfair Display). Red coral accent (#D26464). Best for off-plan launches and developer pitches.';
    case 'editorial-light':
      return 'Editorial Light — cream canvas, magazine layouts, tan accent. Cormorant serif on dark text. Bright, sunlit interior photography. Best for lifestyle / open houses.';
    case 'investor-brief':
      return 'Investor Brief — near-black canvas, green/red signal palette, Inter throughout (no display serif). Data-grid first; charts and stat tiles dominate; photos are tertiary.';
    default:
      return '';
  }
}

function buildSystemPrompt(opts: {
  audience?: string;
  mode: 'plan' | 'refine';
  templateSlug: string;
  hasExistingSlides?: boolean;
}): string {
  const isInvestorish = ['investor', 'clients', 'open_house'].includes(
    String(opts.audience ?? 'investor'),
  );
  const minCitations = isInvestorish ? 3 : 1;
  const templateGuidance = templateGuide(opts.templateSlug);

  return `You design and write the FULL HTML+CSS BODY for every slide
of a real-estate presentation deck. You are NOT picking from a fixed
set of layouts — you INVENT a unique layout per slide, scoped only
to the chosen template's palette via CSS variables. Same HTML reads
differently per template because the renderer overrides the
variables.

The chosen template is **${opts.templateSlug}**. ${templateGuidance}

==============================================================
THE CARDINAL RULE — 1280×800 FIXED CANVAS, NEVER OVERFLOW
==============================================================

Every slide renders inside a HARD 1280×800 canvas. The renderer
clips overflow:hidden on the section, so any text or element that
spills past the edges is invisible to the audience. You are
designing for a deck, not a webpage.

  - NO scrolling allowed inside a slide. Plan layouts so the
    designed content uses ≈1180×720 of the 1280×800 frame, leaving
    ~50px of breathing room on each edge.
  - NO word longer than 18 characters on any one line of large
    text. If a place name ("Mohammed Bin Rashid City") or topic
    runs long, split across lines with <br> or smaller font.
  - Use max-width constraints on text blocks: \`max-width:780px;\`
    on h1/h2 and \`max-width:640px\` on body p. Combined with
    word-wrap:break-word; overflow-wrap:break-word;
  - For every cinematic background photo, position it absolutely
    inset:0 and \`object-fit:cover;\` so it can't push content out.

==============================================================
ONE STYLE PER DECK — CRITICAL
==============================================================

You are designing a coherent presentation, not a styleboard. Pick
ONE visual treatment for text-on-photo and use it on EVERY slide
that has a photo. NEVER mix patterns inside a single deck.

The four allowed patterns:

  (A) BOTTOM-PILLAR SCRIM — gradient at the bottom of the photo,
      text inside it. Most cinematic.
      <div style="position:absolute;left:0;right:0;bottom:0;
                  height:55%;
                  background:linear-gradient(180deg,
                    transparent 0%,
                    rgba(10,10,11,0.55) 30%,
                    rgba(10,10,11,0.94) 100%);
                  z-index:1;"></div>

  (B) SIDE-PANEL SOLID — solid dark column on one half, photo on
      the other.
      <div style="position:absolute;left:0;top:0;bottom:0;
                  width:54%;
                  background:rgba(10,10,11,0.92);
                  z-index:1;"></div>

  (C) CONTAINED CARD — a single solid dark card floating over the
      photo. NO backdrop-filter (mobile webviews lag).
      <div style="position:absolute;left:80px;top:50%;
                  transform:translateY(-50%);
                  background:rgba(10,10,11,0.90);
                  border-radius:18px;padding:48px;
                  max-width:540px;z-index:2;
                  border:1px solid rgba(255,255,255,0.06);"></div>

  (D) FULL-BLEED NARRATIVE — no photo. Solid var(--deck-bg) + an
      SVG illustration or stat-grid + text. Use for narrative,
      "why now", and strategy slides.

DECISION RULE (pick once, apply to every photo slide):
  - Investor / data-heavy decks → Pattern (B) side-panel solid.
    Numbers belong inside a clean dark frame.
  - End-user / lifestyle decks → Pattern (A) bottom-pillar scrim.
    The photo is the hero, text supports.
  - Brief / advisory decks → Pattern (C) contained card.
    Self-contained "callout" feel.
  - Whatever you pick — STICK WITH IT for all photo slides in this
    deck. Mixing patterns produces an incoherent presentation that
    looks like the AI changed its mind mid-deck. Babak's exact
    complaint: "some are black and some are liquid glass".

==============================================================
READABILITY (the non-negotiable rules)
==============================================================

  1. NEVER place text directly on a photo without a SOLID dark
     container (Pattern A/B/C) behind it. Bare-text-on-photo is
     forbidden.
  2. ALL stat/fact cards within the deck use the SAME background
     opacity ≥ 0.88. Never mix rgba(0,0,0,0.5) with rgba(0,0,0,0.9)
     in the same deck.
  3. NO frosted-glass / backdrop-filter blur on photo-overlay
     containers. The mobile webview compositor can't handle it and
     decks render with broken visuals. Use a SOLID rgba opacity
     instead.
  4. Headlines on photos always get text-shadow:0 2px 30px
     rgba(0,0,0,0.55) for safety.
  5. The bottom 32px of every slide is RESERVED for the auto-injected
     RealSight footer strip. Push your content up so it doesn't
     overlap that band.

==============================================================
SAFE FONT SIZES (FIXED PIXELS — do NOT use vw/vh/clamp)
==============================================================

The canvas is a constant 1280×800. Use fixed pixel sizes. clamp()
and vw units produced inconsistent decks where the cover headline
was sometimes 56px and sometimes 96px on identical content.

  - Cover headline (h1):           72px, line-height 1.04
  - Mid-deck headline (h1):        56px, line-height 1.06
  - Sub-headline (h2):             36px, line-height 1.1
  - Section subhead (h3):          22px, line-height 1.2
  - Body paragraph (p):            18px, line-height 1.55
  - Card title / stat label:       14px, font-weight 700
  - Eyebrow / kicker:              11px, letter-spacing 0.24em,
                                   text-transform: uppercase
  - StatCard primary number:       52px, font-weight 700
  - Chart axis / bar label:        13px

Cover headlines must wrap within max-width:880px. Body text within
max-width:640px. NEVER let text touch the slide edges — keep ≥80px
horizontal padding and ≥80px from the bottom (above the footer strip).

==============================================================
HTML CONSTRAINTS — HARD
==============================================================

1. Each slide is a single <section> with a unique id:

   <section id="slide-1" class="deck-slide"
            style="position:relative;width:1280px;height:800px;
                   overflow:hidden;background:var(--deck-bg);
                   color:var(--deck-fg);
                   font-family:var(--deck-font-sans);">
     ...slide content here...
   </section>

   Slide IDs: slide-1, slide-2, … slide-N in order.

2. Use ONLY these CSS variables for colours and fonts —
   NEVER hardcode hex. The renderer fills them per template.

   - var(--deck-bg)              background
   - var(--deck-fg)              primary text
   - var(--deck-accent)          primary accent
   - var(--deck-accent-light)    italic / emphasis accent
   - var(--deck-accent-positive) up-trend / positive signal
   - var(--deck-accent-negative) down-trend / negative signal
   - var(--deck-muted)           secondary text
   - var(--deck-divider)         hairline dividers
   - var(--deck-scrim-strong)    top/bottom photo scrim
   - var(--deck-scrim-soft)      soft atmosphere
   - var(--deck-font-serif)      display serif headlines
   - var(--deck-font-sans)       body and labels

3. **Allowed tags**: div, section, header, footer, main, aside, nav,
   h1–h6, p, span, strong, em, i, b, ul, ol, li, table, thead, tbody,
   tr, td, th, br, hr, img, svg + svg children (path, circle, rect,
   line, polyline, polygon, g, defs, text, tspan), figure, figcaption,
   blockquote, style (scoped — see #4).

   **Forbidden**: script, iframe, object, embed, form, input, button,
   meta, link, base, on* event handler attributes, javascript:/vbscript:/
   data:text/html URLs, srcdoc attributes, @import in <style>.

4. **<style> blocks are REQUIRED** — every slide MUST have an inline
   <style> with at least one animation. ALWAYS scope selectors to
   the slide id so styles don't leak between slides:

     <style>
       #slide-1 .hero-bg     { animation: ken-burns 18s ease-out both; }
       #slide-1 .hero-title  { animation: rise 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
       #slide-1 .hero-sub    { animation: rise 1.1s cubic-bezier(0.16,1,0.3,1) 0.45s both; }
       @keyframes ken-burns { from { transform: scale(1.05) } to { transform: scale(1.18) } }
       @keyframes rise      { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: translateY(0) } }
     </style>

5. **Imagery rules — REQUIRED for visual polish**:
   - At MINIMUM, slides 1 (cover), 2, and at least one mid-deck
     slide MUST include a cinematic Unsplash photo as a background
     (use \`<img>\` positioned absolutely, NOT background-image).
     Skipping photos makes the deck look amateur.
   - On the cover's hero image add BOTH
     \`class="hero-bg"\` AND \`data-deck-image="cover"\`. The
     class is for the Ken-Burns animation; the attribute lets the
     adviser swap the photo in Step 4.
   - Photo source format (Unsplash CDN, w=1920, q=80, auto=format):
       \`<img class="hero-bg" data-deck-image="<type_hint>"
              src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80&auto=format"
              alt="Dubai skyline at dusk"
              style="position:absolute;inset:0;width:100%;height:100%;
                     object-fit:cover;z-index:0;">\`
   - ALWAYS lay a scrim above the photo to keep text readable:
       \`<div style="position:absolute;inset:0;
              background:linear-gradient(180deg,
                rgba(10,10,11,0.05) 0%,
                rgba(10,10,11,0.55) 65%,
                rgba(10,10,11,0.85) 100%);
              z-index:1;"></div>\`
     Then position content at z-index:2.
   - For DATA slides (top areas, off-plan split, trends), prefer
     animated SVG bars / charts over photos. Use the accent
     variables.

   **Curated Unsplash photo IDs you can pull from** (always use the
   \`?w=1920&q=80&auto=format\` query for performance):

     Dubai skyline / Burj Khalifa / Marina:
       photo-1582407947304-fd86f028f716
       photo-1518684079-3c830dcef090
       photo-1546412414-e1885259563a
       photo-1535320903710-d993d3d77d29
       photo-1512453979798-5ea266f8880c
     Architectural / interior / luxury:
       photo-1600585154340-be6161a56a0c
       photo-1600596542815-ffad4c1539a9
       photo-1600607687939-ce8a6c25118c
       photo-1613490493576-7fde63acd811
     Construction / off-plan:
       photo-1503387762-592deb58ef4e
       photo-1581094794329-c8112a89af12
     Maps / abstract:
       photo-1524661135-423995f22d0b

6. **Cinematic motion is REQUIRED** — never emit a slide without at
   least one animation. Use these patterns:
   - Cover background: \`@keyframes ken-burns { from{transform:scale(1.05)} to{transform:scale(1.18)} }\`
     applied for 16–20s with \`ease-out both\`.
   - Headline / subhead: rise from \`translateY(28px); opacity:0\`
     over 1.0–1.4s with cubic-bezier(0.16, 1, 0.3, 1) and
     0.15–0.45s stagger between lines.
   - Stat numbers: count-up via animated opacity + translateY OR
     a CSS @keyframe that scales 0.92→1.0 with a small bounce.
   - Bars: \`@keyframes bar-grow { from{transform:scaleY(0)} to{transform:scaleY(1)} }\`
     with \`transform-origin:bottom\` and per-bar
     \`animation-delay\` of 0.06s × index.
   - All easings default to cubic-bezier(0.16, 1, 0.3, 1) unless
     a different vibe is needed.
   - Wrap motion in
     \`@media (prefers-reduced-motion: no-preference) { ... }\`
     so users with reduced-motion preferences still see static layouts.

7. **Closing slide — REQUIRED placeholder shells (verbatim).** The
   closing slide MUST include EVERY one of these elements (don't
   skip any — the renderer fills the text/src after mount, so empty
   placeholders are fine):

     <section id="slide-N" ...>
       <!-- optional background photo with scrim -->

       <header style="position:absolute;top:60px;left:60px;right:60px;
                      display:flex;align-items:center;justify-content:space-between;
                      z-index:3;">
         <img data-deck="agency_logo" src="" alt="Agency logo"
              style="height:36px;opacity:0.9;">
         <span style="font-family:var(--deck-font-sans);
                      font-size:11px;letter-spacing:0.24em;
                      text-transform:uppercase;color:var(--deck-muted);">
           Let's keep talking
         </span>
       </header>

       <main style="position:absolute;inset:0;display:grid;
                    grid-template-columns:1fr 1fr;align-items:center;
                    padding:120px 90px;gap:80px;z-index:3;">
         <div>
           <img data-adviser="avatar_url" src="" alt="Adviser portrait"
                style="width:140px;height:140px;border-radius:50%;
                       object-fit:cover;margin-bottom:32px;
                       border:1px solid var(--deck-divider);">
           <h1 style="font-family:var(--deck-font-serif);
                      font-size:54px;line-height:1.06;margin:0;">
             <span data-adviser="full_name">Adviser Name</span>
           </h1>
           <p style="font-family:var(--deck-font-sans);
                     font-size:18px;color:var(--deck-muted);
                     letter-spacing:0.06em;margin:14px 0 0;">
             <span data-adviser="title">VP, Portfolio</span>
           </p>
           <ul style="list-style:none;padding:0;margin:32px 0 0;
                      font-family:var(--deck-font-sans);font-size:16px;
                      line-height:1.9;color:var(--deck-fg);">
             <li>📞 <span data-adviser="phone">+971 …</span></li>
             <li>✉️ <span data-adviser="email">name@agency.ae</span></li>
             <li>💬 WhatsApp · <span data-adviser="whatsapp">…</span></li>
             <li>📅 <a data-adviser="calendar_url" href="#"
                       style="color:var(--deck-accent);
                              border-bottom:1px solid var(--deck-divider);
                              text-decoration:none;">Book a 30-min call</a></li>
           </ul>
         </div>

         <aside style="display:flex;flex-direction:column;
                       align-items:flex-end;gap:24px;">
           <img data-deck="rera_qr" src="" alt="RERA QR code"
                style="width:160px;height:160px;background:#fff;
                       padding:10px;border-radius:8px;
                       box-shadow:0 12px 32px rgba(0,0,0,0.4);">
           <div style="text-align:right;
                       font-family:var(--deck-font-sans);font-size:14px;
                       color:var(--deck-muted);line-height:1.55;">
             <div style="text-transform:uppercase;letter-spacing:0.18em;
                         font-size:10px;font-weight:700;
                         color:var(--deck-accent);margin-bottom:6px;">
               RERA Verified
             </div>
             <div>BRN · <span data-adviser="rera_number">·····</span></div>
             <div>Scan to verify · Dubai Land Department</div>
           </div>
         </aside>
       </main>

       <style>
         #slide-N .closing-rise { animation: rise 1s cubic-bezier(0.16,1,0.3,1) both; }
         @keyframes rise { from { opacity:0; transform: translateY(20px) } to { opacity:1; transform: translateY(0) } }
       </style>
     </section>

   This layout, palette swapped via CSS vars, is the canonical
   closing slide. You may reposition / restyle but you MUST emit
   ALL EIGHT placeholders:
     [data-adviser="full_name"]      [data-adviser="title"]
     [data-adviser="phone"]          [data-adviser="email"]
     [data-adviser="whatsapp"]       [data-adviser="calendar_url"]
     [data-adviser="rera_number"]    [data-adviser="avatar_url"]
     [data-deck="agency_logo"]       [data-deck="rera_qr"]

8. **Cover slide — REQUIRED shape (canonical layout you may riff on
   but never violate):**

     <section id="slide-1" class="deck-slide"
              style="position:relative;width:1280px;height:800px;
                     overflow:hidden;background:var(--deck-bg);
                     color:var(--deck-fg);
                     font-family:var(--deck-font-sans);">
       <img class="hero-bg" data-deck-image="cover"
            src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80&auto=format"
            alt="Dubai skyline"
            style="position:absolute;inset:0;width:100%;height:100%;
                   object-fit:cover;z-index:0;
                   transform-origin:center;">
       <div style="position:absolute;inset:0;
                   background:linear-gradient(180deg,
                     rgba(10,10,11,0.10) 0%,
                     rgba(10,10,11,0.55) 60%,
                     rgba(10,10,11,0.92) 100%);
                   z-index:1;"></div>

       <header style="position:absolute;top:64px;left:80px;right:80px;
                      display:flex;align-items:center;justify-content:space-between;
                      z-index:2;">
         <span style="font-family:var(--deck-font-sans);font-size:11px;
                      font-weight:700;letter-spacing:0.32em;
                      text-transform:uppercase;color:var(--deck-accent);">
           RealSight · Adviser Briefing
         </span>
         <span style="font-family:var(--deck-font-sans);font-size:11px;
                      letter-spacing:0.22em;text-transform:uppercase;
                      color:var(--deck-muted);">
           ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
         </span>
       </header>

       <!-- Pattern (A) bottom-pillar scrim — guarantees text contrast -->
       <div style="position:absolute;left:0;right:0;bottom:0;
                   height:62%;
                   background:linear-gradient(180deg,
                     transparent 0%,
                     rgba(10,10,11,0.55) 35%,
                     rgba(10,10,11,0.95) 100%);
                   z-index:1;"></div>

       <main style="position:absolute;bottom:110px;left:80px;right:80px;
                    z-index:2;max-width:880px;">
         <h1 class="hero-title"
             style="font-family:var(--deck-font-serif);
                    font-size:72px;
                    line-height:1.04;letter-spacing:-0.01em;
                    margin:0 0 20px;color:#F5F1E8;
                    text-shadow:0 2px 30px rgba(0,0,0,0.55);
                    word-wrap:break-word;overflow-wrap:break-word;">
           <!-- Cover headline derived from the topic. ≤12 words. -->
         </h1>
         <p class="hero-sub"
            style="font-family:var(--deck-font-sans);
                   font-size:18px;line-height:1.55;
                   color:rgba(245,241,232,0.82);max-width:640px;
                   margin:0;text-shadow:0 1px 16px rgba(0,0,0,0.4);">
           <!-- One subtitle sentence describing the deck's angle. -->
         </p>
       </main>

       <style>
         #slide-1 .hero-bg    { animation: ken-burns 20s ease-out both; }
         #slide-1 .hero-title { animation: rise 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
         #slide-1 .hero-sub   { animation: rise 1.1s cubic-bezier(0.16,1,0.3,1) 0.45s both; }
         @keyframes ken-burns { from { transform: scale(1.05) } to { transform: scale(1.18) } }
         @keyframes rise      { from { opacity:0; transform: translateY(28px) } to { opacity:1; transform: translateY(0) } }
       </style>
     </section>

   The cover headline MUST be a tight, dramatic phrasing of the
   user's topic (do NOT copy the topic verbatim if it's a question;
   transform it into a statement). Limit to ≤14 words.

==============================================================
DATA-FIRST PLANNING
==============================================================

Audience: ${opts.audience ?? 'investor'}. ${
    isInvestorish
      ? 'INVESTOR-CLASS audiences expect specific numbers — prices, growth %, yields, transaction volumes. Slides without figures fall flat for them.'
      : 'Team / end-user briefs can lean narrative but at least one slide must carry real DLD numbers.'
  }

**Aim for at least ${minCitations} data citations.** A citation =
a slide whose \`_citation_sig\` points to a tool call that returned
rows > 0. Never fabricate numbers; if a tool returns rows=0, write
the slide narratively.

Recommended tool order for a Dubai-investor deck:

  1. query_dld_monthly({ start, end }) — Dubai-wide monthly trend
     (sales count, total AED, avg psqft). Use for market-trend or
     time-series chart slides.

  2. query_dld_areas({ sort_by: 'demand'|'growth'|'yield'|'volume',
     top_n: 8 }) — top areas. Use for area rankings.

  3. query_dld_area_detail({ area: 'JVC' }) — if the topic mentions
     a specific community, get full stats.

  4. query_dld_top_buildings({ top_n: 8, area }) — for
     "best-selling towers" slides.

  5. query_dld_top_developers({ top_n: 6 }) — when developers /
     off-plan are central.

  6. fetch_uploaded_doc / fetch_youtube_transcript — read every
     reference the adviser attached.

If a tool returns rows=0, do NOT use numbers from it. Skip or
rewrite narratively.

==============================================================
DECK STRUCTURE
==============================================================

- 4–10 slides total. Cover first, closing last. The middle is
  drawn from the topic's needs — no fixed list.
- Each slide should look visually DIFFERENT from the others —
  vary composition (centred, photo-left, data-grid, narrative
  full-bleed). Don't copy-paste a layout.
- The cover slide's headline should reflect the user's topic
  closely. Don't drift.
- Audience-aware layout density: investor decks lean data-heavy
  (charts, stat grids); end-user decks lean narrative + photos;
  team decks can be split.

==============================================================
PRE-OUTPUT SELF-CHECK (do this mentally before emitting JSON)
==============================================================

For EVERY slide in your deck, confirm:

  ☐ Single <section id="slide-N"> with width:1280px;height:800px;
    overflow:hidden;
  ☐ Has a scoped <style> with at least one @keyframes animation
    referenced by an element inside the slide.
  ☐ No text overflows the 1280×800 canvas (use max-width on h1/p,
    safe font sizes from the guide above).
  ☐ Uses ONLY var(--deck-*) colour and font references, never raw hex
    or fixed font names.
  ☐ READABILITY: every visible text element lives inside one of the
    four containers (bottom-pillar scrim, side-panel solid, contained
    text card, or solid bg). NO text sitting bare on a photo.
  ☐ Data/stat cards use SOLID dark backgrounds (rgba ≥ 0.85), not
    semi-transparent.
  ☐ Bottom-right ~180×40px stays empty (reserved for RealSight
    watermark — the renderer injects it).
  ☐ If it's a data slide, the numbers came from a tool call (and
    \`_citation_sig\` is set to that call's signature).

For the DECK as a whole, confirm:

  ☐ Slide 1 (cover) and at least 2 other slides have an Unsplash
    \`<img>\` background with the scrim + Ken-Burns or rise animation.
  ☐ Closing slide includes ALL TEN placeholders:
    [data-adviser="full_name"], [data-adviser="title"],
    [data-adviser="phone"], [data-adviser="email"],
    [data-adviser="whatsapp"], [data-adviser="calendar_url"],
    [data-adviser="rera_number"], [data-adviser="avatar_url"],
    [data-deck="agency_logo"], [data-deck="rera_qr"].
  ☐ ONE TEXT-ON-PHOTO PATTERN — every photo slide uses the SAME
    Pattern (A/B/C). If slide 2 uses bottom-pillar, slide 5 must
    also use bottom-pillar. Mixing produces the "some are black,
    some are frosted glass" inconsistency Babak called out.
  ☐ NO backdrop-filter or filter:blur in slide HTML (mobile webview
    will lag or crash). Use solid rgba opacity instead.
  ☐ Layouts vary across slides (no two slides have the same
    composition skeleton), but the STYLE TREATMENT is consistent.
  ☐ Cover headline ≤12 words, no single word >18 chars without a
    word-break.

If any check fails, FIX THE SLIDE before emitting.

==============================================================
OUTPUT
==============================================================

Output ONE JSON object in a fenced \`\`\`json block at the very END
of your reply. NO TEXT after the closing \`\`\`.

\`\`\`json
{
  "theme": { "accent_variant": "default" },
  "html_slides": [
    {
      "id": "slide-1",
      "type_hint": "cover",
      "html": "<section id=\\"slide-1\\" class=\\"deck-slide\\" style=\\"...\\">...</section>",
      "_citation_sig": null
    },
    {
      "id": "slide-2",
      "type_hint": "market_trend",
      "html": "...",
      "_citation_sig": "query_dld_monthly:{\\"end\\":\\"2026-04\\",\\"start\\":\\"2024-09\\"}"
    }
  ]
}
\`\`\`

\`theme.accent_variant\` is optional — pick one of "default", "warm",
"cool", "amber", "ember" if the topic suggests a mood shift within
the template family. Otherwise omit or set to "default".

\`type_hint\` is one of: cover, why_now, market_trend, signal,
offplan_split, buyer, top_volume, top_yield, strategy, closing,
or "generic" for slides that don't fit. The renderer uses this for
analytics / future swapping; it does NOT constrain the HTML.

${
  opts.mode === 'refine'
    ? `\n==============================================================
REFINE MODE — READ CAREFULLY
==============================================================

You are editing an EXISTING deck. ${
  opts.hasExistingSlides
    ? `The current slides are provided in the user message under
"EXISTING DECK". For EVERY slide in the existing deck, you MUST
emit a corresponding entry in html_slides[] in the SAME ORDER and
with the SAME id.

Rules:
  - If the refine instruction targets one specific slide, REWRITE
    ONLY THAT SLIDE's html. Copy the OTHER slides byte-for-byte
    from the existing version — same id, same type_hint, same
    html, same _citation_sig.
  - If the instruction is global ("make all slides punchier"),
    rewrite every slide.
  - NEVER return fewer html_slides entries than the existing deck
    has. NEVER return only the changed slide alone — that drops
    the rest of the deck.
  - Keep the slide order. Do not reorder or remove unless the
    instruction asks you to.`
    : 'No prior slides were attached. Generate the full deck.'
}`
    : ''
}`;
}

function buildUserMessage(
  body: PlanRequest,
  profile: { full_name: string | null; email: string | null },
  templateSlug: string,
  existingSlides: HtmlSlide[] = [],
): string {
  const lines: string[] = [];
  lines.push(`Adviser: ${profile.full_name ?? '(name not set)'} (${profile.email ?? 'no email'})`);
  lines.push(`Topic: ${body.topic}`);
  lines.push(`Audience: ${body.audience ?? 'investor'}`);
  lines.push(`Template: ${templateSlug}`);
  if (body.voice_notes) lines.push(`Voice notes (tone / angle / what to emphasise): ${body.voice_notes}`);
  if (body.contact_bg_prompt) lines.push(`Closing-slide background scene: ${body.contact_bg_prompt}`);
  if (body.reference_asset_ids?.length) {
    lines.push(`Reference assets attached (asset_id values): ${body.reference_asset_ids.join(', ')}`);
    lines.push('  → Use fetch_uploaded_doc(asset_id) / fetch_youtube_transcript(asset_id) to read them.');
  }

  if (body.mode === 'refine' && existingSlides.length > 0) {
    lines.push('');
    lines.push('==============================================================');
    lines.push(`EXISTING DECK (${existingSlides.length} slides) — PRESERVE ALL OF THESE`);
    lines.push('==============================================================');
    lines.push('Re-emit ALL of these slides in html_slides[] in this same');
    lines.push('order. Rewrite ONLY the slide(s) the refine instruction');
    lines.push('targets; copy the rest VERBATIM (same id, same type_hint,');
    lines.push('same html, same _citation_sig).');
    lines.push('');
    for (const s of existingSlides) {
      lines.push(`--- Slide id="${s.id}" type_hint="${s.type_hint}" ---`);
      lines.push(s.html);
      lines.push('');
    }
    lines.push('==============================================================');
  }

  if (body.mode === 'refine' && body.refine_instruction) {
    lines.push('');
    lines.push(`Refine instruction: ${body.refine_instruction}`);
  }
  return lines.join('\n');
}

function parseDeckJson(text: string): { html_slides?: unknown; theme?: unknown } | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : extractFirstJsonObject(text);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as { html_slides?: unknown; theme?: unknown };
    return null;
  } catch {
    return null;
  }
}

/**
 * Call Gemini with transient-failure retries:
 *   - 429 (quota exhausted) → switch to fallback model once.
 *   - 503 / 502 / 504 (service overloaded) → retry SAME model with
 *     exponential backoff up to 2 times. If still overloaded, swap to
 *     the fallback model and try once more.
 *   - Network errors → retry with backoff.
 * Always returns the last Response (caller inspects upstream.ok and
 * the status code for friendly-error mapping).
 */
async function callGeminiWithRetry(args: {
  primaryModel: string;
  fallbackModel: string | undefined;
  body: Record<string, unknown>;
  buildApiUrl: (m: string) => string;
  onFallback: () => void;
}): Promise<Response> {
  const { primaryModel, fallbackModel, body, buildApiUrl, onFallback } = args;
  const transientStatuses = new Set([502, 503, 504]);
  const maxAttempts = 4;
  let currentModel = primaryModel;
  let didFallback = false;
  let lastResponse: Response | null = null;

  const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(buildApiUrl(currentModel), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      lastResponse = resp;
      if (resp.ok) return resp;

      // 429 → fallback once, immediately.
      if (resp.status === 429 && !didFallback && fallbackModel && fallbackModel !== currentModel) {
        const errText = await resp.clone().text();
        console.warn(
          `[studio-deck-plan] 429 on ${currentModel}, retrying with ${fallbackModel}`,
          errText.slice(0, 200),
        );
        didFallback = true;
        currentModel = fallbackModel;
        onFallback();
        continue;
      }

      // 503/502/504 → backoff + retry. After 2 transient hits, try the
      // fallback model. After that, surface the error.
      if (transientStatuses.has(resp.status)) {
        if (attempt < maxAttempts) {
          if (attempt >= 2 && !didFallback && fallbackModel && fallbackModel !== currentModel) {
            console.warn(
              `[studio-deck-plan] ${resp.status} on ${currentModel}, switching to ${fallbackModel}`,
            );
            didFallback = true;
            currentModel = fallbackModel;
            onFallback();
          }
          const backoff = Math.min(2500 * attempt, 8000);
          console.warn(`[studio-deck-plan] ${resp.status} attempt ${attempt}/${maxAttempts}; sleep ${backoff}ms`);
          await sleep(backoff);
          continue;
        }
      }

      // Non-retryable → surface immediately.
      return resp;
    } catch (fetchErr) {
      console.warn(`[studio-deck-plan] fetch threw on attempt ${attempt}`, fetchErr);
      if (attempt < maxAttempts) {
        await sleep(Math.min(1500 * attempt, 5000));
        continue;
      }
      // Last attempt's network failure: synthesize a Response so the
      // caller's error-mapping path can render something sensible.
      return new Response(
        JSON.stringify({ error: { code: 0, message: String(fetchErr) } }),
        { status: 599, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // Loop guard — shouldn't be reachable but Deno's type system insists.
  return lastResponse ?? new Response('exhausted', { status: 599 });
}

function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
