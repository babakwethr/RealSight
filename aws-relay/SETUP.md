# AWS Setup Walkthrough — for Babak

Two things you need to do, total ~20 minutes. Then I take over and finish everything.

---

## Task 1 — Create your AWS account (~15 min, one-time only)

1. Open https://aws.amazon.com/ in your browser.
2. Click the orange **Create an AWS Account** button (top-right).
3. Fill in:
   - **Root user email** — your normal email
   - **AWS account name** — `RealSight`
   - Click **Verify email address** → AWS sends you a code → paste it back
4. Set a **strong root user password** (save in your password manager).
5. Choose **Personal** account type. Fill in your name, address, phone.
6. Add a **credit card**. ⚠️ AWS will not charge you — Lambda is free under our usage. The card is for verification only and a small temporary hold (~$1) that's released within a few days.
7. Phone verification — pick SMS or voice call, AWS sends a code, paste it back.
8. Pick the **Basic Support — Free** plan (last screen of signup).
9. After signup, sign into the console at https://console.aws.amazon.com.

✅ **Done.** Reply to me with: *"AWS account ready"*. I'll send Task 2.

---

## Task 2 — Create an admin user for me (~5 min, with screenshots from me)

I'll send you screenshots showing exactly which buttons to click. The output is a small text file with two values (called "access keys"). You paste those values back to me and I'm off — I'll do the rest end-to-end.

The reason I need keys instead of your root password: AWS best-practice is to never share root credentials. The access-key user I'll work under is scoped to only what I need (deploy + manage Lambda).

---

## What I'll do once I have the access keys

1. Run `./aws-relay/deploy.sh` (already prepared in this repo)
2. The script:
   - Packages the relay code
   - Creates an IAM role for Lambda execution
   - Deploys the function to **me-central-1** (UAE region)
   - Creates a public HTTPS Function URL
   - Generates a strong shared secret to keep randos from abusing it
   - Health-checks the deployment
3. I save the Function URL + secret into your Supabase Edge Function secrets
4. I redeploy the dld-proxy (it's already wired to use the relay when those env vars are present)
5. End-to-end smoke test: I trigger one DDA call and watch the logs to confirm real DLD data comes back
6. The "Awaiting" badge on Deal Analyzer flips to **Live** ✅

Total time once I have your access keys: **~30 minutes**.

---

## What this costs

- **AWS Lambda:** $0 (we're well under the 1M-requests/month free tier)
- **AWS Lambda Function URL:** $0
- **Outbound data:** essentially $0 for our volume
- **IAM:** $0

We may see a few cents per month later if traffic 100x's — but realistically, $0/month for the foreseeable future.

---

## What's already done on my side

- ✅ Relay function code (`aws-relay/index.mjs`) — Node.js 20, allow-list of upstream hosts, shared-secret auth, 30s timeout per DDA spec
- ✅ Deploy script (`aws-relay/deploy.sh`) — idempotent, one command to deploy or update
- ✅ Supabase `dld-proxy` updated to forward through `DDA_UAE_RELAY_URL` when set; falls back to direct calls otherwise (useful for local UAE testing)
- ✅ Wire protocol designed: `POST { url, method, headers, body } → { status, headers, body }`
- ✅ AWS CLI installed locally so I can run the deploy script

Everything is staged. The moment your account exists and I have the access keys, deploy is one command.
