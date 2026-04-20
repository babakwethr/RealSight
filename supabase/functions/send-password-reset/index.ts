import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) throw new Error("Email is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Determine redirect URL — use Origin header or fallback to production
    const origin =
      req.headers.get("origin") || "https://realsight.app";
    const redirectTo = `${origin}/auth/callback?flow=recovery`;

    // Generate a password recovery link via Supabase admin API
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

    if (linkError) {
      console.error("Generate link error:", linkError);
      // Don't reveal whether email exists — always return success to the client
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resetLink = linkData.properties.action_link;

    // Send branded email via Resend
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "RealSight <no-reply@realsight.app>",
      to: [email],
      subject: "Reset your password — RealSight",
      html: passwordResetTemplate(resetLink),
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error("Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("send-password-reset error:", error);
    // Always return 200 to avoid leaking info about which emails exist
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/* ─── Email Template ───────────────────────────────────────────────── */

function passwordResetTemplate(resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#111113;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111113;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:40px;">
          <img src="https://realsight.app/assets/realsight/realsight-logo-white.png"
               alt="RealSight" width="200" style="display:block;height:auto;" />
        </td></tr>

        <!-- Card -->
        <tr><td style="background-color:#1a1a1e;border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:40px 36px;">

          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#ffffff;text-align:center;">
            Reset Your Password
          </h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#9a9a9e;text-align:center;">
            We received a request to reset the password for your RealSight account.
            Click the button below to choose a new password.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${resetLink}"
                 style="display:inline-block;background-color:#CAAF6C;color:#000000;text-decoration:none;
                        padding:14px 40px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
                Reset Password
              </a>
            </td></tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#666668;text-align:center;">
            This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#444446;letter-spacing:1.5px;text-transform:uppercase;">
            THE AI INVESTOR LOUNGE
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#444446;">
            &copy; ${new Date().getFullYear()} RealSight. All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
