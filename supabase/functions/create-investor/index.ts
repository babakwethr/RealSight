import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const resendApiKey = Deno.env.get('RESEND_API_KEY');

        // Create admin client that bypasses RLS
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Verify the caller is an authenticated admin
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Check admin role
        const { data: roles } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single();

        if (!roles) {
            return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Get the calling admin's tenant_id from their profile
        const { data: adminProfile } = await supabaseAdmin
            .from('profiles')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single();

        const tenantId = adminProfile?.tenant_id || '00000000-0000-0000-0000-000000000000';

        // Get investor data from request body
        const { name, email, phone, country, preferred_language, notes } = await req.json();

        if (!name || !email) {
            return new Response(JSON.stringify({ error: 'Name and email are required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Insert investor with tenant_id
        const { data: investor, error: insertError } = await supabaseAdmin
            .from('investors')
            .insert({
                name,
                email,
                phone: phone || null,
                country: country || null,
                preferred_language: preferred_language || null,
                notes: notes || null,
                user_id: null,
                tenant_id: tenantId,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return new Response(JSON.stringify({ error: insertError.message }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Auto-activate: create auth user + send invite email
        let emailSent = false;
        let activationError: string | null = null;

        try {
            // Create auth user
            const tempPassword = crypto.randomUUID() + crypto.randomUUID();
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: { full_name: name, tenant_id: tenantId },
            });

            if (createError) throw createError;

            const userId = newUser.user.id;

            // Link investor to auth user
            await supabaseAdmin
                .from('investors')
                .update({ user_id: userId, invitation_sent_at: new Date().toISOString() })
                .eq('id', investor.id);

            // Generate magic link
            const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email,
                options: {
                    redirectTo: `${req.headers.get('origin') || 'https://realsight.app'}/onboarding`,
                },
            });

            if (inviteError || !inviteData?.properties?.action_link) {
                throw new Error(`Failed to generate link: ${inviteError?.message || 'Unknown'}`);
            }

            // Send branded email via Resend
            if (resendApiKey) {
                const resend = new Resend(resendApiKey);
                await resend.emails.send({
                    from: 'Realsight <noreply@realsight.app>',
                    to: [email],
                    subject: 'Welcome to Realsight',
                    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f1115;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1115;padding:60px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#16191f;border-radius:16px;border:1px solid rgba(212,175,55,0.1);overflow:hidden;">
<tr><td style="padding:40px 40px 20px 40px;text-align:center;">
  <h1 style="color:#22c55e;font-size:28px;font-weight:700;margin:0;">Realsight</h1>
</td></tr>
<tr><td style="padding:20px 60px 40px 60px;text-align:center;">
  <h2 style="color:#ffffff;font-size:28px;font-weight:400;margin:0 0 20px 0;line-height:1.2;">Welcome to the<br/>Private Investor Lounge</h2>
  <p style="color:rgba(255,255,255,0.7);font-size:16px;line-height:1.8;margin:0 0 30px 0;">
    Dear ${name},<br/><br/>Your account has been created and is ready for activation.
  </p>
  <a href="${inviteData.properties.action_link}" style="display:inline-block;background:linear-gradient(to right,#d4af37,#c19a2b);color:#000000;text-decoration:none;padding:18px 45px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:1px;">
    ACTIVATE YOUR ACCOUNT
  </a>
  <p style="color:rgba(255,255,255,0.4);font-size:13px;margin-top:50px;line-height:1.6;">
    This invitation is intended solely for ${email}.<br/>The activation link will remain valid for 24 hours.
  </p>
</td></tr>
<tr><td style="padding:30px;background-color:#0d0f12;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
  <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;letter-spacing:1px;">&copy; ${new Date().getFullYear()} REALSIGHT. ALL RIGHTS RESERVED.</p>
</td></tr>
</table></td></tr></table></body></html>`,
                });
                emailSent = true;
            }
        } catch (err: any) {
            console.error('Activation error:', err);
            activationError = err.message;
        }

        return new Response(JSON.stringify({
            investor,
            email_sent: emailSent,
            activation_error: activationError,
        }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Unexpected error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
