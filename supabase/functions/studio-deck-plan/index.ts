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
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const systemPrompt = buildSystemPrompt({
      audience: body.audience,
      mode: body.mode ?? 'plan',
      templateSlug,
    });
    const userMessage = buildUserMessage(body, profile, templateSlug);

    const contents: Array<Record<string, unknown>> = [
      { role: 'user', parts: [{ text: userMessage }] },
    ];
    const tools = [{ functionDeclarations: geminiFunctionDeclarations() }];
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
      const upstream = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools,
          generationConfig: {
            temperature: 0.55,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 32768,
            responseMimeType: 'text/plain',
          },
        }),
      });
      if (!upstream.ok) {
        const errText = await upstream.text();
        console.error('[studio-deck-plan] Gemini error', upstream.status, errText.slice(0, 300));
        return jsonResponse({ error: 'AI service temporarily unavailable' }, 200);
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
    const cleanSlides: HtmlSlide[] = slides.map((s, i) => {
      const sig = (s as { _citation_sig?: string })._citation_sig;
      const citation = sig && citationsByCallSig[sig] ? citationsByCallSig[sig] : undefined;
      return {
        id: typeof s.id === 'string' && s.id.length > 0 ? s.id : `slide-${i + 1}`,
        type_hint: typeof s.type_hint === 'string' ? s.type_hint : 'generic',
        html: sanitizeSlideHtml(s.html),
        citation,
      };
    });

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

4. **<style> blocks are encouraged for animations** — ALWAYS scope
   selectors to the slide id so styles don't leak between slides:

     <style>
       #slide-1 .bar { animation: bar-grow 0.7s cubic-bezier(0.16,1,0.3,1) both; }
       @keyframes bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
     </style>

5. **Imagery rules**:
   - For background photos use a CSS gradient (preferred) OR an
     Unsplash CDN URL: \`<img src="https://images.unsplash.com/photo-...?w=1920&q=80" ...>\`
   - On the FIRST photo element of any slide add a
     \`data-deck-image="<type_hint>"\` attribute. The composer's
     Step 4 lets the adviser swap these.
   - For data slides, prefer SVG / CSS bars over photos.

6. **Cinematic motion** — apply tasteful animation:
   - Cover: slow Ken-Burns scale on background (1.05 → 1.15 over 16s).
   - Data slides: stagger reveal of bars / stats by 0.05–0.1s.
   - All easings: cubic-bezier(0.16, 1, 0.3, 1).
   - Wrap motion in @media (prefers-reduced-motion: no-preference).

7. **Closing slide MUST include adviser placeholders.** Use these
   EXACT element shells (the renderer rewrites text + src attrs):

     <span data-adviser="full_name">Adviser Name</span>
     <span data-adviser="title">VP, Portfolio</span>
     <span data-adviser="phone">+971 …</span>
     <span data-adviser="email">…@…</span>
     <span data-adviser="whatsapp">WhatsApp</span>
     <a    data-adviser="calendar_url" href="#">Book a call</a>
     <span data-adviser="rera_number">BRN ·····</span>
     <img  data-adviser="avatar_url" src="" alt="Adviser portrait"
           style="width:120px;height:120px;border-radius:50%;
                  object-fit:cover;border:1px solid var(--deck-divider);">
     <img  data-deck="agency_logo" src="" alt="Agency"
           style="height:32px;opacity:0.9;">
     <img  data-deck="rera_qr" src="" alt="RERA QR"
           style="height:88px;background:#fff;padding:6px;
                  border-radius:4px;">

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
REFINE MODE
==============================================================

The user is asking you to adjust the existing deck. Re-emit the
FULL html_slides array with the requested change applied. Preserve
the layout invariants of slides you don't change.`
    : ''
}`;
}

function buildUserMessage(
  body: PlanRequest,
  profile: { full_name: string | null; email: string | null },
  templateSlug: string,
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
