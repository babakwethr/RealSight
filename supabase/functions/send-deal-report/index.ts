// send-deal-report — emails an adviser's PDF deal analysis to a client.
//
// Flow:
//   1. Adviser clicks "Email to client" in DealAnalyzer.
//   2. Client generates PDF locally, base64-encodes it, posts here.
//   3. We resolve the adviser's tenant for the From-name + reply-to.
//   4. Send via Resend with the PDF attached + a branded HTML body
//      that includes a "Powered by RealSight" upsell footer.
//
// Auth: requires a valid Supabase JWT (verify_jwt = true). The function
// reads the caller's tenant from `profiles.tenant_id` so an adviser
// can only ever send "as their own brand" — no spoofing other tenants.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')!;

interface SendDealReportPayload {
  recipientEmail: string;
  recipientName?: string;
  message?: string;
  pdfBase64: string;       // raw base64 (no data: prefix)
  propertyName: string;
  reportType?: 'deal' | 'presentation';
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

function htmlBody(args: {
  brandName: string;
  brandTagline?: string;
  message?: string;
  recipientName?: string;
  propertyName: string;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
  tenantSlug?: string;
}): string {
  const greet = args.recipientName ? `Hi ${escapeHtml(args.recipientName)},` : 'Hi there,';
  const customMessage = args.message
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap;">${escapeHtml(args.message)}</p>`
    : `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#1a1a1a;">Please find attached the property analysis for <strong>${escapeHtml(args.propertyName)}</strong>. Happy to walk through it whenever suits — just hit reply.</p>`;
  const slug = args.tenantSlug ? `realsight.app/a/${args.tenantSlug}` : 'realsight.app';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg,#0a0f2e 0%,#1a2a6b 100%);padding:32px 32px 24px;">
            <div style="color:#FFB020;font-size:11px;font-weight:800;letter-spacing:2px;margin-bottom:8px;">${escapeHtml(args.brandName.toUpperCase())}</div>
            ${args.brandTagline ? `<div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:1px;">${escapeHtml(args.brandTagline.toUpperCase())}</div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <h1 style="margin:0 0 4px;font-size:22px;color:#0a0f2e;">Property Analysis Report</h1>
            <div style="color:#666;font-size:13px;margin-bottom:20px;">${escapeHtml(args.propertyName)}</div>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#1a1a1a;">${greet}</p>
            ${customMessage}
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#1a1a1a;">The full report is attached as a PDF — it includes the AI verdict, comparable transactions, market context and our recommended strategy.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr><td style="background:#0a0f2e;border-radius:8px;">
                <div style="padding:12px 22px;color:#FFB020;font-size:14px;font-weight:700;">📎 Open the attached PDF</div>
              </td></tr>
            </table>
            ${args.agentName ? `
            <div style="border-top:1px solid #eee;padding-top:20px;color:#1a1a1a;">
              <div style="font-size:11px;color:#999;letter-spacing:1px;margin-bottom:6px;">YOUR PROPERTY ADVISER</div>
              <div style="font-weight:700;font-size:15px;">${escapeHtml(args.agentName)}</div>
              ${args.agentPhone ? `<div style="font-size:13px;color:#666;margin-top:2px;">${escapeHtml(args.agentPhone)}</div>` : ''}
              ${args.agentEmail ? `<div style="font-size:13px;color:#666;">${escapeHtml(args.agentEmail)}</div>` : ''}
            </div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9fb;padding:16px 32px;border-top:1px solid #eee;text-align:center;">
            <div style="font-size:11px;color:#999;letter-spacing:0.5px;">
              Powered by <a href="https://${slug}" style="color:#18d6a4;text-decoration:none;font-weight:700;">RealSight</a> · ${slug}
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Caller's JWT — used to look up their tenant.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-role client for DB reads (bypasses RLS — we still verify
    // identity by decoding the JWT below).
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: userResult, error: userErr } = await svc.auth.getUser(jwt);
    if (userErr || !userResult?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userResult.user.id;
    const userEmail = userResult.user.email;

    const body = (await req.json()) as SendDealReportPayload;
    if (!body.recipientEmail || !body.pdfBase64 || !body.propertyName) {
      return new Response(JSON.stringify({ error: 'Missing required fields (recipientEmail, pdfBase64, propertyName)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve the adviser's tenant for branding.
    const { data: profile } = await svc
      .from('profiles')
      .select('full_name, tenant_id')
      .eq('user_id', userId)
      .maybeSingle();

    let brandName = 'RealSight';
    let brandTagline: string | undefined;
    let tenantSlug: string | undefined;
    let agentName = profile?.full_name || userEmail || 'Your Adviser';

    if (profile?.tenant_id) {
      const { data: tenant } = await svc
        .from('tenants')
        .select('broker_name, subdomain, branding_config')
        .eq('id', profile.tenant_id)
        .maybeSingle();
      if (tenant) {
        brandName    = tenant.broker_name || 'RealSight';
        tenantSlug   = tenant.subdomain || undefined;
        const brand  = (tenant.branding_config ?? {}) as Record<string, unknown>;
        brandTagline = typeof brand.tagline === 'string' ? brand.tagline : undefined;
      }
    }

    const filename = `${brandName.replace(/\s+/g, '_')}_${body.propertyName.replace(/\s+/g, '_').slice(0, 60)}.pdf`;

    // Send via Resend.
    const fromName = `${brandName} via RealSight`;
    const fromEmail = 'noreply@realsight.app';
    const resendBody = {
      from:        `${fromName} <${fromEmail}>`,
      to:          [body.recipientEmail],
      reply_to:    userEmail || fromEmail,
      subject:     `Property analysis · ${body.propertyName}`,
      html:        htmlBody({
        brandName,
        brandTagline,
        message:        body.message,
        recipientName:  body.recipientName,
        propertyName:   body.propertyName,
        agentName,
        agentEmail:     userEmail,
        tenantSlug,
      }),
      attachments: [
        { filename, content: body.pdfBase64 },
      ],
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    });

    const resendJson = await resendRes.json();
    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: 'Email provider rejected the message', detail: resendJson }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: resendJson?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
