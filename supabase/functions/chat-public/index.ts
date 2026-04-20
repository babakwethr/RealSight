import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONTACT_KEYWORDS = [
  "human", "agent", "call", "phone", "whatsapp",
  "contact", "email", "meeting", "speak", "talk",
  "representative", "advisor", "consultation", "demo", "support"
];

const CONTACT_BLOCK = `To speak with our team or schedule a demo, please use the following contact options:

✉️ Email: support@realsight.app
🌐 Request Access: /request-access`;

const DEFAULT_SYSTEM_PROMPT = `You are Realsight AI Assistant, an expert in global real estate investment. You provide professional advice on:
- Global property market overviews and trends
- Identifying the best areas to invest based on criteria
- ROI, rental yields, and capital appreciation estimation
- Buying process, fees, and standard costs
- Off-plan vs ready properties
- Investment strategies for foreign investors

If the user asks about off-plan projects, reply:
"You can browse live off-plan projects in the Projects section (/projects). Tell me your budget, preferred area, or payment plan and I’ll guide you there."

If the user asks about unrelated topics (politics, personal issues, non-real estate topics), reply:
"I specialize only in real estate investment. If you need dedicated assistance, you can contact our team."

IMPORTANT: If the user asks to speak to a human, wants a meeting, consultation, or to contact the team, always let them know you can't do that.
`;

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
    // Parse request body
    const body = await req.json();
    const messages = body.messages as ChatMessage[];
    const tenantId = body.tenantId as string | undefined;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context
    let finalSystemPrompt = DEFAULT_SYSTEM_PROMPT;
    let customContactBlock = CONTACT_BLOCK;

    // If we have a tenantId, try to fetch custom instructions
    if (tenantId) {
      console.log(`Fetching tenant instructions for ${tenantId}`);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('tenants')
        .select('broker_name, branding_config')
        .eq('id', tenantId)
        .single();

      if (data && data.branding_config) {
        const config = data.branding_config as any;
        if (config.ai_instructions) {
          finalSystemPrompt = config.ai_instructions;
        }
        if (data.broker_name) {
          customContactBlock = `To speak with ${data.broker_name}, please reach out to the contacts listed on the website.`;
        }
      }
    }

    // Get the last user message for keyword check
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");

    if (lastUserMessage) {
      const lowerContent = lastUserMessage.content.toLowerCase();
      const hasContactKeyword = CONTACT_KEYWORDS.some(keyword => lowerContent.includes(keyword));

      if (hasContactKeyword) {
        console.log("Contact keyword detected, returning contact block");
        return new Response(
          JSON.stringify({ reply: customContactBlock }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for API key
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages for Gemini API
    const contents = messages
      .filter(m => m.role !== "system") // System prompt is handled separately
      .slice(-20)
      .map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

    console.log(`Calling Gemini API directly for public chat using model: ${GEMINI_MODEL}`);
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: finalSystemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
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

    const data = await aiResponse.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    console.log("Gemini response received successfully");
    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in chat-public:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
