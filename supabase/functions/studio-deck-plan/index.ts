/**
 * studio-deck-plan — Studio Deck Builder LLM orchestrator.
 *
 * Takes a brief (topic + audience + voice_notes + reference assets)
 * and returns a deck outline of 5–10 slides drawn from the type
 * catalogue, with every numeric claim backed by a Citation from a
 * registered tool-call.
 *
 * Contract:
 *   IN  POST {
 *     topic: string,
 *     audience: 'end_user'|'investor'|'both'|'team'|'clients'|'open_house',
 *     voice_notes?: string,
 *     contact_bg_prompt?: string,
 *     reference_asset_ids?: string[],
 *     template_slug?: string,
 *     deck_id?: string,                // when refining an existing deck
 *     mode?: 'plan' | 'refine',        // 'refine' = chat-with-LLM
 *     refine_instruction?: string,     // for mode='refine'
 *   }
 *
 *   OUT 200 {
 *     deck_id: string,
 *     outline: OutlineEntry[],
 *   }
 *
 * Loop:
 *   1. Send brief + tools[] to Gemini.
 *   2. Gemini may respond with N parallel functionCall parts.
 *      Execute each, append functionResponse parts, re-send.
 *   3. Repeat until Gemini emits a final text response containing
 *      the outline as JSON. Parse and persist.
 *
 * Hard rule baked into the system prompt: no number on any slide
 * may exist that wasn't the literal return value of a tool-call.
 * The LLM is instructed to skip numeric phrasing rather than
 * hallucinate.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  geminiFunctionDeclarations,
  findStudioTool,
  type ToolContext,
} from '../_shared/studioTools.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SLIDE_CATALOGUE = [
  'cover',
  'why_now',
  'market_trend',
  'signal',
  'offplan_split',
  'buyer',
  'top_volume',
  'top_yield',
  'strategy',
  'closing',
] as const;

const MAX_TOOL_ITERATIONS = 8;
const MIN_SLIDES = 5;
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

interface OutlineEntry {
  slide_type: string;
  headline?: string;
  body?: string;
  citation?: unknown;
  data?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ────────────────────────────────────────────────────
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

    // ── Resolve profile + tenant ────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, tenant_id, full_name, email')
      .eq('user_id', userId)
      .single();
    if (profileError || !profile) {
      return jsonResponse(
        { error: 'No profile found for the current user.' },
        403,
      );
    }
    if (!profile.tenant_id) {
      return jsonResponse(
        { error: 'Adviser is not attached to a tenant — Studio is adviser-only.' },
        403,
      );
    }

    // ── Parse request ───────────────────────────────────────────
    const body = (await req.json()) as PlanRequest;
    if (!body.topic || body.topic.trim().length < 8) {
      return jsonResponse(
        { error: 'Topic must be at least 8 characters.' },
        400,
      );
    }
    if (body.topic.length > 1024) {
      return jsonResponse({ error: 'Topic too long (max 1024 chars).' }, 413);
    }

    // ── Upsert the draft deck row ───────────────────────────────
    let deckId = body.deck_id;
    if (!deckId) {
      const { data: deck, error: insertError } = await supabase
        .from('studio_decks')
        .insert({
          tenant_id: profile.tenant_id,
          profile_id: profile.id,
          template_slug: body.template_slug ?? 'cinematic-gold',
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
        return jsonResponse(
          { error: `Could not create draft deck: ${insertError?.message}` },
          500,
        );
      }
      deckId = deck.id as string;
    }

    // ── Build system prompt ─────────────────────────────────────
    const systemPrompt = buildSystemPrompt({
      audience: body.audience,
      mode: body.mode ?? 'plan',
      slideCatalogue: SLIDE_CATALOGUE,
    });

    const userMessage = buildUserMessage(body, profile);

    // ── Gemini function-calling loop ────────────────────────────
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return jsonResponse({ error: 'AI service not configured' }, 500);
    }
    const model =
      Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const contents: Array<Record<string, unknown>> = [
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const tools = [{ functionDeclarations: geminiFunctionDeclarations() }];

    // Track citations as the loop progresses; we attach them to
    // outline entries at the end.
    const citationsByCallSig: Record<
      string,
      {
        tool: string;
        params: Record<string, unknown>;
        rows: number;
        fetched_at: string;
        source: string;
        window?: string;
      }
    > = {};

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
            temperature: 0.4,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: 'text/plain',
          },
        }),
      });
      if (!upstream.ok) {
        const errText = await upstream.text();
        console.error('[studio-deck-plan] Gemini error', upstream.status, errText);
        return jsonResponse(
          { error: 'AI service temporarily unavailable' },
          502,
        );
      }
      const data = await upstream.json();
      const candidate = data.candidates?.[0];
      const parts: Array<Record<string, unknown>> =
        candidate?.content?.parts ?? [];

      const functionCalls = parts.filter((p) => p.functionCall);

      // Append the model turn to the conversation.
      contents.push({ role: 'model', parts });

      if (functionCalls.length === 0) {
        // Final text response.
        finalText = parts
          .map((p) => (typeof p.text === 'string' ? p.text : ''))
          .join('');
        break;
      }

      // Execute each tool call, append a function-response turn.
      const functionResponseParts: Array<Record<string, unknown>> = [];
      for (const part of functionCalls) {
        const fc = (part.functionCall as { name: string; args?: Record<string, unknown> });
        const tool = findStudioTool(fc.name);
        if (!tool) {
          functionResponseParts.push({
            functionResponse: {
              name: fc.name,
              response: { error: `Unknown tool: ${fc.name}` },
            },
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
            functionResponse: {
              name: fc.name,
              response: { error: String(err) },
            },
          });
        }
      }
      contents.push({ role: 'function', parts: functionResponseParts });
    }

    if (!finalText) {
      return jsonResponse(
        { error: 'AI did not return a final outline (loop exhausted).' },
        504,
      );
    }

    // ── Parse outline JSON from finalText ───────────────────────
    const outline = parseOutlineJson(finalText);
    if (!outline || outline.length < MIN_SLIDES) {
      return jsonResponse(
        {
          error: `Outline was malformed or too short (got ${outline?.length ?? 0} slides).`,
          raw: finalText.slice(0, 500),
        },
        502,
      );
    }
    if (outline.length > MAX_SLIDES) outline.length = MAX_SLIDES;

    // Attach citations from the function-call ledger to the right
    // outline entries. The LLM is instructed to include _citation_sig
    // alongside any numbers it sourced from a tool.
    for (const entry of outline) {
      const sig = (entry as { _citation_sig?: string })._citation_sig;
      if (sig && citationsByCallSig[sig]) {
        entry.citation = citationsByCallSig[sig];
      }
      delete (entry as { _citation_sig?: string })._citation_sig;
    }

    // ── Persist outline + bump status to 'draft' (idempotent) ───
    const { error: updateError } = await supabase
      .from('studio_decks')
      .update({
        outline,
        last_data_refresh_at: new Date().toISOString(),
      })
      .eq('id', deckId);
    if (updateError) {
      console.error('[studio-deck-plan] DB update failed', updateError);
      // Still return the outline so the front-end isn't blocked.
    }

    return jsonResponse({ deck_id: deckId, outline }, 200);
  } catch (err) {
    console.error('[studio-deck-plan] uncaught', err);
    return jsonResponse(
      { error: (err as Error)?.message ?? 'Internal error' },
      500,
    );
  }
});

// ── Helpers ──────────────────────────────────────────────────────

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

function buildSystemPrompt(opts: {
  audience?: string;
  mode: 'plan' | 'refine';
  slideCatalogue: readonly string[];
}): string {
  const isInvestorish = ['investor', 'clients', 'open_house'].includes(
    String(opts.audience ?? 'investor'),
  );
  const minCitations = isInvestorish ? 3 : 1;

  return `You are the planner for a polished, data-backed real-estate
presentation deck. The audience persona is ${opts.audience ?? 'investor'}.

Your job: produce a JSON outline of ${MIN_SLIDES}–${MAX_SLIDES} slides drawn
from this fixed catalogue (in this exact spelling):

  ${opts.slideCatalogue.join(', ')}

==============================================================
DATA-FIRST PLANNING (read this first)
==============================================================

The audience is ${opts.audience ?? 'investor'}. ${
    isInvestorish
      ? `INVESTOR-CLASS AUDIENCES expect numbers — prices,
growth %, rental yields, transaction volumes, area rankings. Slides
without specific figures land flat for these people.`
      : 'Team training and end-user briefs can lean narrative, but at least one slide MUST carry real DLD numbers so the deck has credibility.'
  }

**HARD REQUIREMENT — minimum ${minCitations} data citations in this deck.**
A "data citation" = an outline entry whose \`_citation_sig\` points to
a tool call that returned rows > 0. Decks under the threshold are
rejected.

**Before drafting any slide text, call data tools.** Recommended
order for a Dubai-investor deck:

  1. \`query_dld_monthly({ start, end })\` — get the 12-24 month
     Dubai-wide trend (sales count + total AED + avg psqft per month).
     Use this for the \`market_trend\` and \`signal\` slides.

  2. \`query_dld_areas({ sort_by: 'demand'|'growth'|'yield'|'volume',
     top_n: 8 })\` — get top areas by the metric that fits the topic.
     Use this for \`top_volume\` (sort_by='volume'), \`top_yield\`
     (sort_by='yield'), or as raw material for the \`strategy\` slide.

  3. \`query_dld_area_detail({ area: 'JVC' })\` — if the topic
     mentions a specific community, call this and weave the psqft +
     growth + yield numbers into the narrative.

  4. \`query_dld_top_buildings({ top_n: 8, area })\` — for
     building-focused decks ("best-selling towers in Dubai Marina").

  5. \`query_dld_top_developers({ top_n: 6 })\` — when developers /
     off-plan launches are central.

  6. \`query_dld_recent_transactions({ area, limit: 8 })\` — sparingly,
     when concrete deal examples make the abstract numbers tangible.

  7. \`fetch_uploaded_doc({ asset_id })\` / \`fetch_youtube_transcript({ asset_id })\`
     — read every reference the adviser attached; their context shapes
     the narrative.

**If a tool returns rows = 0**, do not invent values; either skip the
slide or rewrite it as a qualitative narrative (no numbers). NEVER
fabricate.

==============================================================
STRUCTURAL RULES
==============================================================

1. **Cover is always first. Closing is always last.** Use exactly
   one of each.

2. **The middle is 3–8 slides** drawn from the catalogue.
   Pick the most relevant for the topic. Avoid duplicates.

3. **No number may appear on any slide that wasn't the literal
   return value of one of the tools you called.** Skip the number
   rather than guess.

4. **When a slide cites a number, include _citation_sig in its
   outline entry** equal to the tool name plus a stable
   stringification of the params — e.g.
   "_citation_sig": "query_dld_monthly:{\\"end\\":\\"2026-04\\",\\"start\\":\\"2024-09\\"}".
   The orchestrator uses this to attach the citation chip.

5. **English only.** The pilot agents work in English.

6. **Do not name vendors, agencies, or people in headlines** unless
   the user's topic explicitly requested it.

7. **Output one JSON object** in a fenced \`\`\`json block at the
   end of your reply, in this exact shape:

\`\`\`json
{
  "outline": [
    {
      "slide_type": "cover",
      "headline": "...",
      "body": "...",
      "data": {
        "title": "...",
        "subtitle": "...",
        "eyebrow": "...",
        "presenter": "...",
        "data_source_label": "..."
      }
    },
    {
      "slide_type": "market_trend",
      "headline": "...",
      "body": "...",
      "data": {
        "bars": [{ "label": "Jan 26", "value": 16913, "highlight": false }, ...],
        "caption": "...",
        "pivot_index": 12,
        "stats": [{ "label": "...", "value": "...", "sub": "...", "accent": false }]
      },
      "_citation_sig": "query_dld_monthly:{...}"
    },
    ...
    {
      "slide_type": "closing",
      "headline": "...",
      "body": "...",
      "data": { "closing_quote": "..." }
    }
  ]
}
\`\`\`

8. **Slide-type → data shape (be precise):**
   - cover: { title, subtitle?, eyebrow?, presenter?, data_source_label? }
   - why_now: { paragraphs: string[] }   // 1-3 paragraphs
   - market_trend: { bars: { label, value, highlight? }[], caption?, pivot_index?, stats? }
   - signal: { bars: { label, value, highlight? }[], caption?, signal_text?, stats? }
   - offplan_split: { window_label, total_deals, total_value_bn, off_plan_pct_count, secondary_pct_count, off_plan_pct_value, secondary_pct_value }
   - buyer: { rows: { type, tag, qualify, plays: string[] }[] }   // 2 rows
   - top_volume: { rows: { area, primary, secondary? }[], window_label?, caption? }
   - top_yield: { rows: { area, primary, secondary? }[], window_label?, caption? }
   - strategy: { intro?, tiers: { tier, label, items: string[], why? }[] }   // 1-3 tiers
   - closing: { closing_quote? }   // adviser contact comes from profile, NOT from the LLM

9. **Tools are gated:**  call them when you need data. If a tool
   returns rows=0 (data unavailable), do NOT use numbers from it.
   Just write the slide in prose.

10. **Cover slide's \`presenter\` field** should be the adviser's
    full name (provided in the user message). Do not invent a name.

${
  opts.mode === 'refine'
    ? `\nREFINE MODE: the user is asking you to adjust an existing
outline. Re-emit the FULL outline JSON with the requested change
applied. Preserve all existing citations.`
    : ''
}
`;
}

function buildUserMessage(body: PlanRequest, profile: { full_name: string | null; email: string | null }): string {
  const lines: string[] = [];
  lines.push(`Adviser: ${profile.full_name ?? '(name not set)'} (${profile.email ?? 'no email'})`);
  lines.push(`Topic: ${body.topic}`);
  lines.push(`Audience: ${body.audience ?? 'investor'}`);
  if (body.voice_notes) lines.push(`Voice notes (tone / angle / what to emphasise): ${body.voice_notes}`);
  if (body.contact_bg_prompt) lines.push(`Closing-slide background scene: ${body.contact_bg_prompt}`);
  if (body.reference_asset_ids?.length) {
    lines.push(`Reference assets attached (asset_id values): ${body.reference_asset_ids.join(', ')}`);
    lines.push('  → Use fetch_uploaded_doc(asset_id) or fetch_youtube_transcript(asset_id) to read them when relevant.');
  }
  lines.push(`Template: ${body.template_slug ?? 'cinematic-gold'}`);
  if (body.mode === 'refine' && body.refine_instruction) {
    lines.push('');
    lines.push(`Refine instruction: ${body.refine_instruction}`);
  }
  return lines.join('\n');
}

function parseOutlineJson(text: string): OutlineEntry[] | null {
  // Prefer fenced ```json blocks; fall back to first { ... } object.
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : extractFirstJsonObject(text);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.outline)) return parsed.outline as OutlineEntry[];
    if (Array.isArray(parsed)) return parsed as OutlineEntry[];
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
