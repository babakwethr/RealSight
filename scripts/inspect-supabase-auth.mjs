#!/usr/bin/env node
/**
 * Inspect the raw Supabase auth config response to identify correct field names.
 */
import { readFileSync } from 'fs';

const PROJECT_REF = 'hcbpveurcfdvfjskovvf';
const API_BASE = 'https://api.supabase.com';
const TOKEN = readFileSync('/tmp/.sb_token', 'utf-8').trim();

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function main() {
  // Get auth config
  const res = await fetch(`${API_BASE}/v1/projects/${PROJECT_REF}/config/auth`, { headers });
  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const cfg = await res.json();
  
  // Print all keys and their values (filter for relevant ones)
  const keys = Object.keys(cfg).sort();
  console.log(`Total fields: ${keys.length}\n`);
  
  // Print URL-related fields
  console.log('=== URL-related fields ===');
  keys.filter(k => /url|uri|redirect|site|external/i.test(k)).forEach(k => {
    console.log(`  ${k}: ${JSON.stringify(cfg[k])}`);
  });
  
  // Print SMTP/email-related fields
  console.log('\n=== SMTP/Email-related fields ===');
  keys.filter(k => /smtp|mail|email|sender/i.test(k)).forEach(k => {
    // Don't print password values
    if (/pass|secret|key/i.test(k)) {
      console.log(`  ${k}: ${cfg[k] ? '"(set)"' : '"(not set)"'}`);
    } else {
      console.log(`  ${k}: ${JSON.stringify(cfg[k])}`);
    }
  });

  // Print all keys (just names, no values) for reference
  console.log('\n=== All field names ===');
  console.log(keys.join('\n'));
}

main().catch(err => { console.error(err.message); process.exit(1); });
