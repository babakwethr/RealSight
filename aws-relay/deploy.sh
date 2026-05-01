#!/usr/bin/env bash
# deploy.sh — one-shot AWS Lambda deploy for the dda-uae-relay.
#
# Idempotent: re-running updates the function code + secret in place.
# Outputs a Function URL + the shared secret. Save those into Supabase
# Edge Function secrets as DDA_UAE_RELAY_URL + DDA_UAE_RELAY_SECRET.
#
# Prereqs (set in env before running):
#   AWS_ACCESS_KEY_ID         — IAM admin user access key
#   AWS_SECRET_ACCESS_KEY     — IAM admin user secret
#   AWS_REGION                — must be me-central-1 (UAE region)
#
# Optional:
#   FUNCTION_NAME             — Lambda name (default: dda-uae-relay)
#   ROLE_NAME                 — IAM role for Lambda (default: dda-uae-relay-role)
#   RELAY_SHARED_SECRET       — pre-generated secret. If absent, we
#                                generate a fresh 64-char random one.
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-me-central-1}"
FUNCTION_NAME="${FUNCTION_NAME:-dda-uae-relay}"
ROLE_NAME="${ROLE_NAME:-dda-uae-relay-role}"
RUNTIME="nodejs20.x"

if [ "$AWS_REGION" != "me-central-1" ]; then
  echo "❌ AWS_REGION must be me-central-1 (UAE) — got '$AWS_REGION'."
  exit 1
fi

if [ -z "${RELAY_SHARED_SECRET:-}" ]; then
  RELAY_SHARED_SECRET="$(openssl rand -hex 32)"
  echo "🔑 Generated fresh RELAY_SHARED_SECRET (64 hex chars)"
fi

cd "$(dirname "$0")"

# ── 1. Package the Lambda code ──────────────────────────────────────────
echo "📦 Packaging Lambda zip…"
rm -f function.zip
zip -q -j function.zip index.mjs
echo "   → function.zip ($(du -h function.zip | cut -f1))"

# ── 2. Create / reuse the IAM execution role ────────────────────────────
echo "🔐 Ensuring IAM role '$ROLE_NAME' exists…"
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || true)

if [ -z "$ROLE_ARN" ]; then
  echo "   → role missing, creating…"
  TRUST_POLICY='{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'
  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --query 'Role.Arn' --output text)
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "   → created role: $ROLE_ARN"
  echo "   → waiting 10s for IAM to propagate…"
  sleep 10
else
  echo "   → reusing role: $ROLE_ARN"
fi

# ── 3. Create or update the Lambda function ─────────────────────────────
echo "⚙️  Deploying Lambda '$FUNCTION_NAME' to $AWS_REGION…"
EXISTING=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$AWS_REGION" --query 'Configuration.FunctionName' --output text 2>/dev/null || true)

if [ -z "$EXISTING" ]; then
  echo "   → function missing, creating…"
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --role "$ROLE_ARN" \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 35 \
    --memory-size 256 \
    --region "$AWS_REGION" \
    --environment "Variables={RELAY_SHARED_SECRET=$RELAY_SHARED_SECRET}" \
    --no-cli-pager > /dev/null
  echo "   → created"
else
  echo "   → function exists, updating code…"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://function.zip \
    --region "$AWS_REGION" \
    --no-cli-pager > /dev/null
  # Wait for the code update to finish before we touch config
  aws lambda wait function-updated \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION"
  echo "   → updating env (preserving secret if not supplied)…"
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --environment "Variables={RELAY_SHARED_SECRET=$RELAY_SHARED_SECRET}" \
    --no-cli-pager > /dev/null
fi

# ── 4. Function URL (public HTTPS endpoint) ─────────────────────────────
echo "🌐 Ensuring public Function URL…"
FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --region "$AWS_REGION" \
  --query 'FunctionUrl' --output text 2>/dev/null || true)

if [ -z "$FUNCTION_URL" ]; then
  echo "   → URL missing, creating…"
  FUNCTION_URL=$(aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --auth-type NONE \
    --cors '{"AllowOrigins":["*"],"AllowMethods":["GET","POST"],"AllowHeaders":["content-type","x-relay-secret"],"MaxAge":86400}' \
    --query 'FunctionUrl' --output text)
  # Function URL must also have a public-invoke permission
  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id FunctionURLAllowPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    --region "$AWS_REGION" \
    --no-cli-pager > /dev/null 2>&1 || true
  echo "   → URL created"
else
  echo "   → URL already exists"
fi

# ── 5. Health check ─────────────────────────────────────────────────────
echo "🩺 Health check…"
HEALTH=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$FUNCTION_URL" || true)
HTTP_STATUS=$(echo "$HEALTH" | grep -oE "HTTP_STATUS:[0-9]+" | cut -d: -f2)
HEALTH_BODY=$(echo "$HEALTH" | sed '/HTTP_STATUS:/d')
if [ "$HTTP_STATUS" = "200" ]; then
  echo "   ✅ healthy: $HEALTH_BODY"
else
  echo "   ⚠️  health check returned $HTTP_STATUS — may still be warming up"
  echo "       body: $HEALTH_BODY"
fi

# ── 6. Output the values to set in Supabase ─────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DEPLOY COMPLETE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Set these two secrets in Supabase Edge Function vault:"
echo ""
echo "  DDA_UAE_RELAY_URL    = $FUNCTION_URL"
echo "  DDA_UAE_RELAY_SECRET = $RELAY_SHARED_SECRET"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Save to a file for downstream use
cat > deploy-output.json <<JSON
{
  "function_name": "$FUNCTION_NAME",
  "region": "$AWS_REGION",
  "function_url": "$FUNCTION_URL",
  "relay_shared_secret": "$RELAY_SHARED_SECRET",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
echo "📝 Saved details to: $(pwd)/deploy-output.json"

# Cleanup the build artifact
rm -f function.zip
