/**
 * gemini-proxy — thin pass-through to Google's Gemini generateContent API.
 *
 * Why this exists:
 *   • DealAnalyzer (`src/pages/DealAnalyzer.tsx`) calls
 *     `supabase.functions.invoke('gemini-proxy', { body: { prompt } })` to get
 *     a structured AI verdict (Strong Buy / Buy / Conditional Buy / Hold /
 *     Avoid + strengths/weaknesses/strategy).
 *   • InvestorPresentationPDF.tsx and the AI Investor Presentation flow expect
 *     the SAME shape: a single `prompt` in, the raw Gemini response out.
 *   • Until 27 Apr 2026 this function was only specced (in PRODUCT_PLAN.md
 *     §12 and REALSIGHT_MASTER_SPEC.md §12) but never deployed — every
 *     Deal Analyzer run silently fell back to the static computed verdict.
 *
 * Contract:
 *   IN:   POST { prompt: string, temperature?: number, model?: string }
 *   OUT:  the verbatim Gemini response — frontend reads
 *         data.candidates[0].content.parts[0].text
 *
 * Auth:
 *   verify_jwt = true on this function (set at deploy time). Only logged-in
 *   users hit it; that gates against random scrapers burning our Gemini quota.
 *
 * Pattern mirrors `chat-concierge` (already deployed + working) and
 * `chat-public` (which hits Gemini directly via REST).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GeminiProxyRequest {
  prompt: string;
  temperature?: number;
  model?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth gate (light) ────────────────────────────────────────────────
    // We don't strictly need to know WHO the user is — we just want to make
    // sure SOMEONE is logged in so we don't burn Gemini quota on random
    // scrapers. JWT verification is enforced at the gateway level
    // (verify_jwt=true). We additionally validate via getUser() to catch
    // edge cases.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — please log in" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — invalid session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Parse request ────────────────────────────────────────────────────
    const body = await req.json() as GeminiProxyRequest;
    const prompt = body.prompt;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or empty `prompt` in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Belt-and-braces: cap prompt size so a runaway client can't POST 10MB.
    if (prompt.length > 32_000) {
      return new Response(
        JSON.stringify({
          error: "Prompt too long (max 32,000 characters).",
        }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Gemini call ──────────────────────────────────────────────────────
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      console.error("[gemini-proxy] GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const model = body.model || Deno.env.get("GEMINI_MODEL") ||
      "gemini-2.5-flash";
    const temperature = typeof body.temperature === "number"
      ? body.temperature
      : 0.7;

    console.log(
      `[gemini-proxy] user=${userData.user.id} model=${model} prompt_len=${prompt.length}`,
    );

    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30_000);

    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("[gemini-proxy] Gemini error:", upstream.status, errText);
      return new Response(
        JSON.stringify({
          error: "AI service temporarily unavailable",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Pass the raw Gemini response through. The frontend reads
    // `data.candidates[0].content.parts[0].text` directly, so we don't
    // wrap or transform — clients keep the structure they already expect.
    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[gemini-proxy] error:", err);
    return new Response(
      JSON.stringify({
        error: err?.message ?? "Internal proxy error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
