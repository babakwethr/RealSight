/**
 * dda-uae-relay — AWS Lambda relay for Dubai Land Department's
 * DDA Open API gateway, deployed in `me-central-1` (UAE region).
 *
 * Why this exists
 * ---------------
 * DDA's gateway is geo-restricted to UAE source IPs (per
 * HowToUseAPI.pdf §6.3). RealSight's Supabase Edge Functions egress
 * from Tokyo (`ap-northeast-1`), so direct calls 403. This Lambda
 * runs inside UAE and acts as a dumb pass-through: Supabase POSTs
 * the upstream request envelope to here, we forward it to DDA from
 * a UAE IP, and return the response.
 *
 * The Lambda holds NO DDA credentials. Those stay in Supabase's
 * Edge Function vault. This relay only knows how to forward HTTPS
 * requests to a small allow-list of upstream hosts.
 *
 * Auth
 * ----
 * We require a shared secret in the `x-relay-secret` header that
 * matches the `RELAY_SHARED_SECRET` env var set on the Lambda. This
 * stops randoms from abusing the public Function URL to send their
 * own traffic to DDA on our quota. The secret is generated at deploy
 * time and stored in Supabase Edge Function secrets as
 * `DDA_UAE_RELAY_SECRET`.
 *
 * Wire protocol (POST /, JSON)
 * ----------------------------
 * Request:
 *   {
 *     "url":     "https://stg-apis.data.dubai/secure/...",  (required)
 *     "method":  "POST",                                    (required)
 *     "headers": { "Content-Type": "application/json", ... },
 *     "body":    "<string body>"                            (optional)
 *   }
 *
 * Response:
 *   {
 *     "status":  200,
 *     "headers": { ... },
 *     "body":    "<string body>"
 *   }
 *
 * Errors are returned with HTTP 4xx/5xx + a JSON `{ error: "..." }`
 * body so the caller can surface them.
 *
 * Allow-list
 * ----------
 * We only forward to *.data.dubai. Any other host is rejected with
 * 403. This is defence-in-depth — even if our shared secret leaks,
 * the relay can't be used to attack arbitrary URLs.
 */

const ALLOWED_HOST_SUFFIXES = ['.data.dubai'];
const FETCH_TIMEOUT_MS = 30_000; // matches DDA's documented 30s upstream timeout

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function isAllowedHost(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'https:') return false;
    return ALLOWED_HOST_SUFFIXES.some(suffix => u.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export const handler = async (event) => {
  // Lambda Function URL passes the request as { rawPath, headers, body, requestContext.http.method, ... }
  // Standardise across invocation modes.
  const method = (event.requestContext?.http?.method || event.httpMethod || 'POST').toUpperCase();

  // Health check — easy to test the deploy without sharing the secret
  if (method === 'GET') {
    return jsonResponse(200, {
      status: 'ok',
      service: 'dda-uae-relay',
      region: process.env.AWS_REGION || 'unknown',
      ts: new Date().toISOString(),
    });
  }

  if (method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed; POST a request envelope or GET for health.' });
  }

  // Verify shared secret
  const expected = process.env.RELAY_SHARED_SECRET;
  if (!expected) {
    return jsonResponse(500, { error: 'Relay misconfigured: RELAY_SHARED_SECRET not set.' });
  }
  // Lambda Function URL lowercases header names per HTTP/2 convention.
  const provided = event.headers?.['x-relay-secret'] ?? event.headers?.['X-Relay-Secret'];
  if (provided !== expected) {
    return jsonResponse(401, { error: 'Invalid or missing x-relay-secret.' });
  }

  // Parse the request envelope
  let envelope;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    envelope = JSON.parse(raw || '{}');
  } catch {
    return jsonResponse(400, { error: 'Body must be valid JSON.' });
  }

  const { url, method: upstreamMethod = 'GET', headers = {}, body = undefined } = envelope;

  if (!url || typeof url !== 'string') {
    return jsonResponse(400, { error: 'Envelope must include a string `url`.' });
  }
  if (!isAllowedHost(url)) {
    return jsonResponse(403, {
      error: `URL host not in allow-list. Permitted: ${ALLOWED_HOST_SUFFIXES.join(', ')}.`,
    });
  }

  // Don't forward host-controlled headers — let fetch set them.
  const safeHeaders = { ...headers };
  delete safeHeaders.host;
  delete safeHeaders.Host;
  delete safeHeaders['content-length'];
  delete safeHeaders['Content-Length'];

  // Forward
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  let upstream;
  try {
    upstream = await fetch(url, {
      method: upstreamMethod,
      headers: safeHeaders,
      body: body ?? undefined,
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err?.name === 'AbortError';
    return jsonResponse(aborted ? 504 : 502, {
      error: aborted ? 'Upstream timed out.' : `Upstream fetch failed: ${err?.message || 'unknown'}`,
    });
  }
  clearTimeout(timer);

  const responseBody = await upstream.text();
  const responseHeaders = {};
  upstream.headers.forEach((value, key) => {
    // Skip hop-by-hop / encoding headers — would confuse the consumer
    const k = key.toLowerCase();
    if (k === 'content-encoding' || k === 'transfer-encoding' || k === 'connection') return;
    responseHeaders[k] = value;
  });

  return jsonResponse(200, {
    status: upstream.status,
    headers: responseHeaders,
    body: responseBody,
  });
};
