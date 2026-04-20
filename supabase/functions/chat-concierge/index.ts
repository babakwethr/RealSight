import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UAE_REAL_ESTATE_SYSTEM_PROMPT = `You are Realsight AI Concierge, an intelligent assistant specializing in real estate investment advisory. You serve investors and advisors on the Realsight platform.

You discuss topics related to:
- Property market overview, trends, and forecasts
- Best areas to invest (with a focus on Dubai/UAE but also global markets)
- ROI expectations, rental yields, and capital appreciation rates
- Mortgage and financing options for residents and non-residents
- Buying costs, fees, and taxes
- Laws and regulations for foreign investors purchasing property
- Off-plan vs ready properties: pros, cons, and payment plan structures
- Developer credibility and track records
- Property management, rental processes, and tenant laws
- Visa benefits connected to property investment

IMPORTANT RULES:
1. Be helpful, professional, and knowledgeable about real estate investment
2. Provide specific, actionable advice when asked
3. Use the currency appropriate for the market being discussed
4. For questions completely unrelated to real estate, politely redirect:
   "I specialize in real estate investment advisory. Feel free to ask me anything about property markets, investment opportunities, or portfolio strategy."
5. Never provide legal, tax, or financial advice as a licensed professional - always recommend consulting qualified professionals for final decisions
6. Be conversational and friendly, matching the premium service tone of Realsight
7. If the user asks to speak to a human or wants a consultation, respond with:
   "I'd be happy to connect you with your advisor. Please reach out via the contact details in your account, or ask your advisor directly through the platform."
8. NEVER reference any specific individual by name. You represent the Realsight platform.

Current market context: Dubai real estate has shown strong growth, with the market remaining attractive to international investors due to tax advantages, high rental yields (typically 5-8% for residential), and the Golden Visa program.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Please log in to use the concierge" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the user session using getUser()
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("JWT validation failed:", userError?.message || "No user");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log("Authenticated user:", userId);

    // Parse request body
    const body = await req.json();
    const messages = body.messages as ChatMessage[];

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages for AI with system prompt
    const aiMessages: ChatMessage[] = [
      { role: "system", content: UAE_REAL_ESTATE_SYSTEM_PROMPT },
      ...messages.slice(-20), // Keep last 20 messages for context
    ];

    // Check for API key (LOVABLE_API_KEY is replaced by GEMINI_API_KEY)
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please add GEMINI_API_KEY secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages for Gemini API
    const contents = messages
      .filter(m => m.role !== "system")
      .slice(-20)
      .map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

    console.log(`Calling Gemini API directly with streaming using model: ${GEMINI_MODEL}`);
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${geminiApiKey}&alt=sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: UAE_REAL_ESTATE_SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errorText);

      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini SSE stream to OpenAI-compatible format expected by frontend
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                const openAiFormat = {
                  choices: [{ delta: { content } }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAiFormat)}\n\n`));
              }
            } catch (e) {
              // Ignore invalid JSON or non-data lines
            }
          }
        }
      }
    });

    // Stream the transformed response back
    return new Response(aiResponse.body?.pipeThrough(transformStream), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Error in chat-concierge:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
