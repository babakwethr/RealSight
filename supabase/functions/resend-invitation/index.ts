import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendInvitationRequest {
  user_id: string;
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

    if (!resendApiKey) {
      throw new Error("Email service not configured");
    }

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
      throw new Error("Only admins can resend invitations");
    }

    // Parse request body
    const body: ResendInvitationRequest = await req.json();
    const { user_id } = body;

    if (!user_id) {
      throw new Error("Missing required field: user_id");
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user details from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (userError || !userData.user) {
      throw new Error("User not found");
    }

    const targetUser = userData.user;
    
    // Check if user has already logged in
    if (targetUser.last_sign_in_at) {
      throw new Error("User has already logged in. Cannot resend invitation.");
    }

    // Get profile for the user's name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user_id)
      .single();

    const fullName = profile?.full_name || targetUser.email?.split("@")[0] || "User";

    // Generate new magic link
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.email!,
      options: {
        redirectTo: `${req.headers.get("origin") || supabaseUrl}/login`,
      },
    });

    if (magicLinkError || !magicLinkData?.properties?.action_link) {
      console.error("Error generating magic link:", magicLinkError);
      throw new Error("Failed to generate invitation link");
    }

    // Send invitation email
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "RealSight <no-reply@realsight.app>",
      to: [targetUser.email!],
      subject: "Your Invitation to RealSight — The AI Investor Lounge",
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#111113;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111113;padding:48px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td align="center" style="padding-bottom:40px;">
  <img src="https://realsight.app/assets/realsight/realsight-logo-white.png" alt="RealSight" width="200" style="display:block;height:auto;"/>
</td></tr>
<tr><td style="background-color:#1a1a1e;border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:40px 36px;">
  <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#ffffff;text-align:center;">You're Invited</h1>
  <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#ffffff;text-align:center;">Hello ${fullName},</p>
  <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#9a9a9e;text-align:center;">
    You have been invited to join the RealSight Investor Lounge. Click the button below to access your account.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <a href="${magicLinkData.properties.action_link}"
       style="display:inline-block;background-color:#CAAF6C;color:#000000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:15px;">
      Access Your Account
    </a>
  </td></tr></table>
  <p style="margin:28px 0 0;font-size:13px;color:#666668;text-align:center;">This link expires in 24 hours.</p>
</td></tr>
<tr><td style="padding-top:32px;text-align:center;">
  <p style="margin:0;font-size:11px;color:#444446;letter-spacing:1.5px;text-transform:uppercase;">THE AI INVESTOR LOUNGE</p>
  <p style="margin:8px 0 0;font-size:12px;color:#444446;">&copy; ${new Date().getFullYear()} RealSight. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>`,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error("Failed to send invitation email");
    }

    // Update invitation_sent_at in investors table
    await supabaseAdmin
      .from("investors")
      .update({ invitation_sent_at: new Date().toISOString() })
      .eq("user_id", user_id);

    console.log("Invitation email resent successfully to:", targetUser.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in resend-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
