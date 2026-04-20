#!/usr/bin/env node
/**
 * RealSight — Supabase Auth & Email Configuration Script
 * Project: hcbpveurcfdvfjskovvf (propsight-prod)
 *
 * Reads access token from /tmp/.sb_token (never printed).
 * 1. Prints current auth config (URLs + email)
 * 2. Updates Site URL, Redirect URLs, and SMTP sender via Resend
 * 3. Prints final config and verifies
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_REF = 'hcbpveurcfdvfjskovvf';
const API_BASE = 'https://api.supabase.com';

let TOKEN;
try {
  TOKEN = readFileSync('/tmp/.sb_token', 'utf-8').trim();
} catch {
  console.error('❌ Could not read token from /tmp/.sb_token');
  process.exit(1);
}
if (!TOKEN) {
  console.error('❌ Token file /tmp/.sb_token is empty.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ── Helpers ─────────────────────────────────────────────────────────
async function getAuthConfig() {
  const res = await fetch(`${API_BASE}/v1/projects/${PROJECT_REF}/config/auth`, { headers });
  if (!res.ok) throw new Error(`GET auth config failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function updateAuthConfig(patch) {
  const res = await fetch(`${API_BASE}/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH auth config failed (${res.status}): ${await res.text()}`);
  return res.json();
}

function printConfig(cfg, label) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('═'.repeat(60));

  console.log('\n📍 URL Configuration:');
  console.log(`   site_url:              ${cfg.site_url ?? '(not set)'}`);
  console.log(`   uri_allow_list:        ${cfg.uri_allow_list ?? '(empty)'}`);

  console.log('\n📧 Email / SMTP Configuration:');
  console.log(`   mailer_autoconfirm:    ${cfg.mailer_autoconfirm}`);
  console.log(`   smtp_admin_email:      ${cfg.smtp_admin_email ?? '(not set)'}`);
  console.log(`   smtp_sender_name:      ${cfg.smtp_sender_name ?? '(not set)'}`);
  console.log(`   smtp_host:             ${cfg.smtp_host ?? '(not set / Supabase default)'}`);
  console.log(`   smtp_port:             ${cfg.smtp_port ?? '(not set)'}`);
  console.log(`   smtp_user:             ${cfg.smtp_user ?? '(not set)'}`);
  console.log(`   smtp_pass set?:        ${cfg.smtp_pass ? '✅ yes (hidden)' : '❌ no'}`);
  console.log(`   smtp_max_frequency:    ${cfg.smtp_max_frequency ?? '(not set)'}`);
  console.log(`   rate_limit_email_sent: ${cfg.rate_limit_email_sent ?? '(not set)'}`);

  console.log('\n📩 Send-Email Hook:');
  console.log(`   hook_send_email_enabled: ${cfg.hook_send_email_enabled}`);
  console.log(`   hook_send_email_uri:     ${cfg.hook_send_email_uri ?? '(not set)'}`);

  console.log('\n🔐 Signup & Auth:');
  console.log(`   disable_signup:        ${cfg.disable_signup}`);
  console.log(`   mailer_otp_exp:        ${cfg.mailer_otp_exp}s`);
  console.log(`   password_min_length:   ${cfg.password_min_length}`);
  console.log('');
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Fetching current auth config for project hcbpveurcfdvfjskovvf...');

  // ── Step 1: Print current config ──────────────────────────────────
  const current = await getAuthConfig();
  printConfig(current, 'CURRENT CONFIG (before changes)');

  // ── Step 2: Build patch ───────────────────────────────────────────
  const changes = {};
  const changeLog = [];

  // 2a. Site URL
  if (current.site_url !== 'https://realsight.app') {
    changes.site_url = 'https://realsight.app';
    changeLog.push(`site_url: "${current.site_url || '(empty)'}" → "https://realsight.app"`);
  } else {
    console.log('✅ site_url is already correct.');
  }

  // 2b. Redirect URLs
  const currentList = current.uri_allow_list || '';
  const redirectUrls = currentList ? currentList.split(',').map((u) => u.trim()) : [];
  const callbackUrl = 'https://realsight.app/auth/callback';
  if (!redirectUrls.some((u) => u === callbackUrl || u === 'https://realsight.app/**')) {
    redirectUrls.push(callbackUrl);
    changes.uri_allow_list = redirectUrls.join(',');
    changeLog.push(`uri_allow_list: added "${callbackUrl}"`);
  } else {
    console.log('✅ uri_allow_list already includes auth/callback.');
  }

  // 2c. SMTP — configure Resend if not already set up
  const hasSmtpHost = current.smtp_host && current.smtp_host.length > 0;
  const needsSender = current.smtp_admin_email !== 'no-reply@realsight.app';

  if (!hasSmtpHost || needsSender) {
    // Read Resend API key from .env
    let resendKey = '';
    try {
      const envContent = readFileSync(join(process.cwd(), '.env'), 'utf-8');
      const match = envContent.match(/RESEND_API_KEY="?([^"\n]+)"?/);
      if (match) resendKey = match[1];
    } catch {}

    if (resendKey) {
      if (!hasSmtpHost) {
        changes.smtp_host = 'smtp.resend.com';
        changes.smtp_port = '465';
        changes.smtp_user = 'resend';
        changes.smtp_pass = resendKey;
        changeLog.push('smtp_host: → smtp.resend.com');
        changeLog.push('smtp_port: → 465');
        changeLog.push('smtp_user: → resend');
        changeLog.push('smtp_pass: → (Resend API key — hidden)');
      }
      if (needsSender) {
        changes.smtp_admin_email = 'no-reply@realsight.app';
        changes.smtp_sender_name = 'RealSight';
        changeLog.push(`smtp_admin_email: "${current.smtp_admin_email || '(default)'}" → "no-reply@realsight.app"`);
        changeLog.push(`smtp_sender_name: "${current.smtp_sender_name || '(default)'}" → "RealSight"`);
      }
    } else {
      console.log('\n⚠️  Could not read RESEND_API_KEY from .env — SMTP cannot be configured automatically.');
      console.log('   You will need to set up SMTP manually in the Supabase dashboard.');
    }
  } else {
    console.log('✅ SMTP is already configured with correct sender.');
  }

  // ── Step 3: Apply ─────────────────────────────────────────────────
  if (Object.keys(changes).length === 0) {
    console.log('\n✅ Everything is already correctly configured. No changes needed.');
    return;
  }

  console.log('\n📝 Changes to apply:');
  changeLog.forEach((c) => console.log(`   • ${c}`));

  console.log('\n⏳ Applying changes...');
  await updateAuthConfig(changes);
  console.log('✅ PATCH applied successfully.');

  // ── Step 4: Re-read and print final config ────────────────────────
  // Small delay to let config propagate
  await new Promise((r) => setTimeout(r, 2000));
  const final = await getAuthConfig();
  printConfig(final, 'FINAL CONFIG (after changes)');

  // ── Step 5: Verification ──────────────────────────────────────────
  console.log('🔍 Verification:');
  const ok = (cond, msg) => console.log(`   ${cond ? '✅' : '❌'} ${msg}`);
  ok(final.site_url === 'https://realsight.app', `site_url = ${final.site_url}`);

  const finalList = (final.uri_allow_list || '').split(',').map((u) => u.trim());
  ok(
    finalList.includes('https://realsight.app/auth/callback') ||
      finalList.includes('https://realsight.app/**'),
    `uri_allow_list includes auth/callback → ${final.uri_allow_list}`
  );
  ok(final.smtp_admin_email === 'no-reply@realsight.app', `smtp_admin_email = ${final.smtp_admin_email}`);
  ok(final.smtp_host === 'smtp.resend.com', `smtp_host = ${final.smtp_host}`);
  ok(final.smtp_sender_name === 'RealSight', `smtp_sender_name = ${final.smtp_sender_name}`);
  ok(!!final.smtp_pass, `smtp_pass is set`);
  console.log('\n🏁 Done.');
}

main().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
