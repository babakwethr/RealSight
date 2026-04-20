import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_EMAIL = "demo@realsight.app";
const DEMO_PASSWORD = "Realsight2025!";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if ADMIN_SEED_TOKEN is configured
    const expectedToken = Deno.env.get("ADMIN_SEED_TOKEN");
    if (!expectedToken) {
      console.error("ADMIN_SEED_TOKEN secret not configured");
      return new Response(
        JSON.stringify({
          error: "ADMIN_SEED_TOKEN not set",
          message: "Please add the ADMIN_SEED_TOKEN secret in your environment settings."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate admin token from header
    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken || adminToken !== expectedToken) {
      console.log("Invalid or missing admin token");
      return new Response(
        JSON.stringify({ error: "Forbidden - Invalid admin token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin token validated, proceeding with demo user seeding...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === DEMO_EMAIL);

    let userId: string;

    if (existingUser) {
      console.log("Demo user exists, updating password...");
      userId = existingUser.id;

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });

      if (updateError) {
        console.error("Error updating user:", updateError);
        throw updateError;
      }
    } else {
      console.log("Creating new demo user...");

      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Realsight Demo" },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
    }

    console.log("User ID:", userId);

    // Check if investor already exists for this user
    const { data: existingInvestor } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingInvestor) {
      console.log("Investor already exists, cleaning up old data...");

      // Delete existing holdings, payments, documents, chat data
      await supabaseAdmin.from("holdings").delete().eq("investor_id", existingInvestor.id);
      await supabaseAdmin.from("payments").delete().eq("investor_id", existingInvestor.id);
      await supabaseAdmin.from("documents").delete().eq("investor_id", existingInvestor.id);

      // Delete chat messages first (foreign key), then threads
      const { data: threads } = await supabaseAdmin
        .from("chat_threads")
        .select("id")
        .eq("investor_id", existingInvestor.id);

      if (threads) {
        for (const thread of threads) {
          await supabaseAdmin.from("chat_messages").delete().eq("thread_id", thread.id);
        }
        await supabaseAdmin.from("chat_threads").delete().eq("investor_id", existingInvestor.id);
      }
    }

    // Get or create investor
    let investorId: string;

    if (existingInvestor) {
      investorId = existingInvestor.id;
      // Update investor details
      await supabaseAdmin
        .from("investors")
        .update({ name: "Realsight Demo", phone: "+1234567890", country: "UAE" })
        .eq("id", investorId);
    } else {
      // Create investor (the trigger may have already created one)
      const { data: newInvestor, error: investorError } = await supabaseAdmin
        .from("investors")
        .upsert({
          user_id: userId,
          email: DEMO_EMAIL,
          name: "Realsight Demo",
          phone: "+1234567890",
          country: "UAE",
        }, { onConflict: "user_id" })
        .select("id")
        .single();

      if (investorError) {
        console.error("Error creating investor:", investorError);
        throw investorError;
      }
      investorId = newInvestor.id;
    }

    // Ensure profile exists
    await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        email: DEMO_EMAIL,
        full_name: "Realsight Demo",
        country: "UAE",
      }, { onConflict: "user_id" });

    // Ensure user role exists
    await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "user",
      }, { onConflict: "user_id, role" });

    console.log("Investor ID:", investorId);

    // Get project IDs
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, name")
      .order("created_at")
      .limit(4);

    if (!projects || projects.length < 4) {
      console.error("Not enough projects found. Need at least 4 projects.");
      return new Response(
        JSON.stringify({ error: "Insufficient projects in database. Please seed projects first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found projects:", projects.map(p => p.name));

    // ~$150M portfolio across 12 holdings
    const holdings = [
      // Marina Heights - 3 units ($35.5M)
      { project_id: projects[0].id, unit_ref: "Penthouse A-01", invested_amount: 18000000, current_value: 20700000, status: "active" },
      { project_id: projects[0].id, unit_ref: "Unit A-205", invested_amount: 8500000, current_value: 9775000, status: "active" },
      { project_id: projects[0].id, unit_ref: "Unit B-101", invested_amount: 12000000, current_value: 13800000, status: "active" },
      // Palm Residences - 2 units ($40.5M)
      { project_id: projects[1].id, unit_ref: "Villa 12", invested_amount: 22000000, current_value: 25300000, status: "active" },
      { project_id: projects[1].id, unit_ref: "Villa 8", invested_amount: 18500000, current_value: 21275000, status: "active" },
      // Downtown Lofts - 4 units ($27.5M)
      { project_id: projects[2].id, unit_ref: "Loft 501", invested_amount: 6500000, current_value: 7475000, status: "active" },
      { project_id: projects[2].id, unit_ref: "Loft 602", invested_amount: 7200000, current_value: 8280000, status: "active" },
      { project_id: projects[2].id, unit_ref: "Loft 703", invested_amount: 5800000, current_value: 6670000, status: "active" },
      { project_id: projects[2].id, unit_ref: "Loft 804", invested_amount: 8000000, current_value: 9200000, status: "active" },
      // Skyline Plaza - 3 units ($43.5M)
      { project_id: projects[3].id, unit_ref: "Office 1201", invested_amount: 14500000, current_value: 16675000, status: "active" },
      { project_id: projects[3].id, unit_ref: "Office 1502", invested_amount: 16000000, current_value: 18400000, status: "active" },
      { project_id: projects[3].id, unit_ref: "Retail R-05", invested_amount: 13000000, current_value: 14950000, status: "active" },
    ];

    const holdingsWithInvestor = holdings.map(h => ({ ...h, investor_id: investorId }));
    const { error: holdingsError } = await supabaseAdmin.from("holdings").insert(holdingsWithInvestor);
    if (holdingsError) {
      console.error("Error inserting holdings:", holdingsError);
      throw holdingsError;
    }

    console.log("Inserted 12 holdings totaling ~$150M");

    // Payments - mix of paid, due, and overdue
    const today = new Date();
    const payments = [
      // Paid payments
      { project_id: projects[0].id, amount: 1800000, due_date: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), status: "paid", note: "Initial deposit - Penthouse A-01" },
      { project_id: projects[0].id, amount: 3600000, due_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), status: "paid", note: "First milestone payment" },
      { project_id: projects[1].id, amount: 2200000, due_date: new Date(today.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString(), status: "paid", note: "Booking amount - Villa 12" },
      { project_id: projects[1].id, amount: 4400000, due_date: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(), status: "paid", note: "Foundation completion" },
      { project_id: projects[2].id, amount: 650000, due_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), status: "paid", note: "Reservation fee - Loft 501" },
      { project_id: projects[2].id, amount: 1300000, due_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(), status: "paid", note: "First installment" },
      { project_id: projects[3].id, amount: 1450000, due_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), status: "paid", note: "Booking - Office 1201" },
      { project_id: projects[3].id, amount: 2900000, due_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), status: "paid", note: "Structure completion" },
      // Due payments
      { project_id: projects[0].id, amount: 3600000, due_date: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(), status: "due", note: "Second milestone - 30% completion" },
      { project_id: projects[1].id, amount: 4400000, due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: "due", note: "Structure completion payment" },
      { project_id: projects[2].id, amount: 1300000, due_date: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(), status: "due", note: "Construction progress - 50%" },
      { project_id: projects[3].id, amount: 2900000, due_date: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(), status: "due", note: "Interior works commencement" },
      // Overdue payments
      { project_id: projects[0].id, amount: 1800000, due_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), status: "overdue", note: "Service charge Q1 2025" },
      { project_id: projects[1].id, amount: 2200000, due_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), status: "overdue", note: "Landscaping milestone" },
    ];

    const paymentsWithInvestor = payments.map(p => ({ ...p, investor_id: investorId }));
    const { error: paymentsError } = await supabaseAdmin.from("payments").insert(paymentsWithInvestor);
    if (paymentsError) {
      console.error("Error inserting payments:", paymentsError);
      throw paymentsError;
    }

    console.log("Inserted 14 payments");

    // Documents
    const documents = [
      // Contracts
      { project_id: projects[0].id, title: "Sales Purchase Agreement - Penthouse A-01", category: "contracts", file_url: "/docs/spa-penthouse-a01.pdf" },
      { project_id: projects[0].id, title: "Sales Purchase Agreement - Unit A-205", category: "contracts", file_url: "/docs/spa-unit-a205.pdf" },
      { project_id: projects[1].id, title: "Villa 12 Purchase Contract", category: "contracts", file_url: "/docs/villa12-contract.pdf" },
      { project_id: projects[2].id, title: "Loft 501 Reservation Agreement", category: "contracts", file_url: "/docs/loft501-agreement.pdf" },
      { project_id: projects[3].id, title: "Office 1201 Commercial Lease", category: "contracts", file_url: "/docs/office1201-lease.pdf" },
      // Receipts
      { project_id: projects[0].id, title: "Payment Receipt - Jan 2025", category: "receipts", file_url: "/docs/receipt-jan25-penthouse.pdf" },
      { project_id: projects[0].id, title: "Payment Receipt - Feb 2025", category: "receipts", file_url: "/docs/receipt-feb25-penthouse.pdf" },
      { project_id: projects[1].id, title: "Villa 12 Booking Receipt", category: "receipts", file_url: "/docs/villa12-booking-receipt.pdf" },
      { project_id: projects[2].id, title: "Loft Payment Confirmation", category: "receipts", file_url: "/docs/loft-payment-confirm.pdf" },
      // Statements
      { project_id: projects[0].id, title: "Q4 2024 Portfolio Statement", category: "statements", file_url: "/docs/q4-2024-statement.pdf" },
      { project_id: projects[1].id, title: "2024 Annual Investment Summary", category: "statements", file_url: "/docs/annual-2024-summary.pdf" },
      { project_id: projects[3].id, title: "Commercial Holdings Report", category: "statements", file_url: "/docs/commercial-report.pdf" },
      // Brochures
      { project_id: projects[0].id, title: "Marina Heights Premium Collection", category: "brochures", file_url: "/docs/marina-heights-brochure.pdf" },
      { project_id: projects[1].id, title: "Palm Residences Luxury Villas", category: "brochures", file_url: "/docs/palm-villas-brochure.pdf" },
      { project_id: projects[2].id, title: "Downtown Lofts Modern Living", category: "brochures", file_url: "/docs/downtown-lofts-brochure.pdf" },
      { project_id: projects[3].id, title: "Skyline Plaza Commercial Spaces", category: "brochures", file_url: "/docs/skyline-commercial-brochure.pdf" },
    ];

    const documentsWithInvestor = documents.map(d => ({ ...d, investor_id: investorId }));
    const { error: documentsError } = await supabaseAdmin.from("documents").insert(documentsWithInvestor);
    if (documentsError) {
      console.error("Error inserting documents:", documentsError);
      throw documentsError;
    }

    console.log("Inserted 16 documents");

    // Create chat thread with welcome messages
    const { data: chatThread, error: threadError } = await supabaseAdmin
      .from("chat_threads")
      .insert({ investor_id: investorId, title: "Welcome Conversation" })
      .select("id")
      .single();

    if (threadError) {
      console.error("Error creating chat thread:", threadError);
      throw threadError;
    }

    const chatMessages = [
      { thread_id: chatThread.id, role: "assistant", content: "Good morning! Welcome to Realsight AI Investor Lounge. I'm your personal AI concierge. I see you have an impressive portfolio of $150M+ across premium Dubai properties. How may I assist you today?", created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
      { thread_id: chatThread.id, role: "user", content: "Thank you! Can you give me a quick overview of my portfolio performance?", created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString() },
      { thread_id: chatThread.id, role: "assistant", content: "Absolutely! Your portfolio is performing exceptionally well:\n\n📊 **Portfolio Summary**\n- Total Invested: $150,000,000\n- Current Value: $172,500,000\n- Total Gain: +$22,500,000 (+15%)\n\n**By Property Type:**\n- Residential (Marina Heights + Palm Villas): ~$111M (+15.5%)\n- Commercial (Downtown Lofts): ~$31.6M (+14.9%)\n- Office/Retail (Skyline Plaza): ~$50M (+15%)\n\nYour strongest performers are the Palm Residences villas at +15% appreciation. Would you like a detailed breakdown of any specific property?", created_at: new Date(Date.now() - 27 * 60 * 1000).toISOString() },
    ];

    const { error: messagesError } = await supabaseAdmin.from("chat_messages").insert(chatMessages);
    if (messagesError) {
      console.error("Error inserting chat messages:", messagesError);
      throw messagesError;
    }

    console.log("Created welcome chat thread");

    // Calculate totals for response
    const totalInvested = holdings.reduce((sum, h) => sum + h.invested_amount, 0);
    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.current_value, 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo user seeded successfully",
        data: {
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          userId,
          investorId,
          portfolio: {
            totalInvested: `$${(totalInvested / 1000000).toFixed(0)}M`,
            currentValue: `$${(totalCurrentValue / 1000000).toFixed(0)}M`,
            gain: `+$${((totalCurrentValue - totalInvested) / 1000000).toFixed(1)}M`,
            holdings: holdings.length,
            payments: payments.length,
            documents: documents.length,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in seed-demo-user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
