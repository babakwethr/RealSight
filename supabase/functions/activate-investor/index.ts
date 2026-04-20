import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivateInvestorRequest {
  investor_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Create client with user's token to verify they're an admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !callingUser) {
      throw new Error("Unauthorized");
    }

    // Check if calling user is admin
    const { data: roleData } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .single();

    if (roleData?.role !== "admin") {
      throw new Error("Only admins can activate investors");
    }

    // Parse request body
    const body: ActivateInvestorRequest = await req.json();
    const { investor_id } = body;

    if (!investor_id) {
      throw new Error("Missing investor_id");
    }

    // Create admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch investor details
    const { data: investor, error: investorError } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("id", investor_id)
      .single();

    if (investorError || !investor) {
      throw new Error("Investor not found");
    }

    if (!investor.email || !investor.name) {
      throw new Error("Investor must have email and name");
    }

    // --- Determine or create the auth user ---
    let userId = investor.user_id;

    if (!userId) {
      // Check if an auth user already exists for this email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      userId = existingUsers?.users?.find((u: any) => u.email === investor.email)?.id;

      if (!userId) {
        // Create new auth user — the handle_new_user trigger will fire
        // and link the existing investor record by email.
        const tempPassword = crypto.randomUUID() + crypto.randomUUID();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: investor.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: investor.name },
        });

        if (createError) {
          throw new Error(`Failed to create user: ${createError.message}`);
        }
        userId = newUser.user.id;
      }

      // Link investor to user (in case the trigger didn't)
      await supabaseAdmin
        .from("investors")
        .update({ user_id: userId, invitation_sent_at: new Date().toISOString() })
        .eq("id", investor_id);
    } else {
      // Already linked — update timestamp for re-send
      await supabaseAdmin
        .from("investors")
        .update({ invitation_sent_at: new Date().toISOString() })
        .eq("id", investor_id);
    }

    // --- Generate invitation link ---
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: investor.email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://realsight.app"}/onboarding`,
      },
    });

    if (inviteError || !inviteData?.properties?.action_link) {
      console.error("Invite link error:", inviteError);
      throw new Error(`Failed to generate invitation link: ${inviteError?.message || 'Unknown error'}`);
    }

    // --- Send branded email via Resend ---
    let emailSent = false;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "Realsight <noreply@realsight.app>",
          to: [investor.email],
          subject: "Welcome to Realsight",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0f1115; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f1115; padding: 60px 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #16191f; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.1); overflow: hidden;">
                      <tr>
                         <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <h1 style="color: #22c55e; font-size: 28px; font-weight: 700; margin: 0;">Realsight</h1>
                          </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 60px 40px 60px; text-align: center;">
                          <h2 style="color: #ffffff; font-size: 28px; font-weight: 400; margin: 0 0 20px 0; line-height: 1.2;">
                            Welcome to the <br/>Private Investor Lounge
                          </h2>
                          <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">
                            Dear ${investor.name},<br/><br/>
                            It is my pleasure to welcome you to the Investor Lounge. Your account has been professionally curated and is now ready for activation. 
                          </p>
                          <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.8; margin: 0 0 40px 0;">
                            As a valued Investor, you now have exclusive access to real-time portfolio tracking, premium market updates, and our bespoke AI concierge service.
                          </p>
                          <a href="${inviteData.properties.action_link}" 
                             style="display: inline-block; background: linear-gradient(to right, #d4af37, #c19a2b); color: #000000; text-decoration: none; padding: 18px 45px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 1px; box-shadow: 0 10px 20px rgba(212, 175, 55, 0.15);">
                            ACTIVATE YOUR ACCOUNT
                          </a>
                          <p style="color: rgba(255, 255, 255, 0.4); font-size: 13px; margin-top: 50px; line-height: 1.6;">
                            This invitation is intended solely for ${investor.email}.<br/>
                            The activation link will remain valid for 24 hours.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 30px; background-color: #0d0f12; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                          <p style="color: rgba(255, 255, 255, 0.3); font-size: 12px; margin: 0; letter-spacing: 1px;">
                            &copy; ${new Date().getFullYear()} REALSIGHT. ALL RIGHTS RESERVED.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
        emailSent = true;
      } catch (emailErr: any) {
        console.error("Error sending email:", emailErr);
        throw new Error(`Email sending failed: ${emailErr?.message || 'Unknown Resend error'}`);
      }
    } else {
      throw new Error("RESEND_API_KEY is not configured");
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: emailSent,
        message: "Investor activated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in activate-investor function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
