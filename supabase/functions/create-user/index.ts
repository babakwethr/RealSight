import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  full_name: string;
  role: "admin" | "user";
  phone?: string;
  country?: string;
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
      throw new Error("Only admins can create users");
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, full_name, role, phone, country } = body;

    // Validate input
    if (!email || !full_name || !role) {
      throw new Error("Missing required fields: email, full_name, role");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    if (!["admin", "user"].includes(role)) {
      throw new Error("Invalid role. Must be 'admin' or 'user'");
    }

    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);
    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    // Generate a secure random password (user will reset via magic link)
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    const userId = newUser.user.id;
    console.log("Created user:", userId);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        email,
        full_name,
        country: country || null,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    // Create investor record with invitation timestamp
    const { error: investorError } = await supabaseAdmin
      .from("investors")
      .insert({
        user_id: userId,
        email,
        name: full_name,
        phone: phone || null,
        country: country || null,
        invitation_sent_at: new Date().toISOString(),
      });

    if (investorError) {
      console.error("Error creating investor:", investorError);
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Generate magic link for user to set their password
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${req.headers.get("origin") || supabaseUrl}/login`,
      },
    });

    if (magicLinkError) {
      console.error("Error generating magic link:", magicLinkError);
    }

    // Send invitation email
    let emailSent = false;
    if (resendApiKey && magicLinkData?.properties?.action_link) {
      try {
        const resend = new Resend(resendApiKey);
        const { error: emailError } = await resend.emails.send({
          from: "RealSight <no-reply@realsight.app>",
          to: [email],
          subject: "Welcome to RealSight — The AI Investor Lounge",
          html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#111113;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111113;padding:48px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td align="center" style="padding-bottom:40px;">
  <img src="https://realsight.app/assets/realsight/realsight-logo-white.png" alt="RealSight" width="200" style="display:block;height:auto;"/>
</td></tr>
<tr><td style="background-color:#1a1a1e;border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:40px 36px;">
  <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#ffffff;text-align:center;">Welcome to RealSight</h1>
  <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#ffffff;text-align:center;">Hello ${full_name},</p>
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
        } else {
          emailSent = true;
          console.log("Invitation email sent successfully");
        }
      } catch (emailErr) {
        console.error("Error sending email:", emailErr);
      }
    } else {
      console.log("Resend API key not configured or magic link generation failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email_sent: emailSent,
        message: emailSent
          ? "User created and invitation sent"
          : "User created but invitation email could not be sent",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
