import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function setUserPlan(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  plan: string,
  stripeCustomerId?: string,
) {
  // 1. Update Supabase Auth user_metadata
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  const existing = userData?.user?.user_metadata || {}

  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existing,
      plan,
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
    },
  })

  // 2. If user belongs to a tenant, update tenant subscription_tier too
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (profile?.tenant_id) {
    const update: Record<string, string> = { subscription_tier: plan }
    if (stripeCustomerId) update.stripe_customer_id = stripeCustomerId

    await supabase
      .from('tenants')
      .update(update)
      .eq('id', profile.tenant_id)
  }

  console.log(`[stripe-webhook] User ${userId} updated to plan "${plan}"`)
}

async function findUserByStripeCustomer(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
): Promise<string | null> {
  // Check profiles first (fast)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (tenant?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    return profile?.user_id || null
  }

  // Fallback: scan user metadata (slower, only for non-tenant users)
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const match = users?.find(u => u.user_metadata?.stripe_customer_id === customerId)
  return match?.id || null
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  let event: Stripe.Event

  try {
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } else {
      // Dev mode: no signature verification
      console.warn('[stripe-webhook] No webhook secret — skipping signature check')
      event = JSON.parse(body)
    }
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`[stripe-webhook] Event: ${event.type}`)

  try {
    switch (event.type) {

      // ── Payment successful → upgrade user ──────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const plan = session.metadata?.plan
        const customerId = session.customer as string
        const referredBy = session.metadata?.referred_by

        if (!userId || !plan) {
          console.error('[stripe-webhook] Missing userId or plan:', { userId, plan })
          break
        }

        await setUserPlan(supabase, userId, plan, customerId)

        // Refer-a-friend bookkeeping (LAUNCH_PLAN.md §14 step 9).
        // Both sides get 1 free month when the referee starts a paid plan. We
        // log the event here so ops can apply Stripe coupons until we automate
        // the coupon issuance (tracked in FUTURE_IDEAS.md).
        if (referredBy) {
          console.log(`[stripe-webhook] REFERRAL_CREDIT_DUE — new sub by ${userId} via code ${referredBy}. Credit 1 month to: (a) referee ${userId}, (b) referrer with code ${referredBy}.`)
        }
        break
      }

      // ── Subscription renewed (recurring charge) ────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (!subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = subscription.metadata?.supabase_user_id
        const plan = subscription.metadata?.plan
        const customerId = subscription.customer as string

        if (userId && plan) {
          await setUserPlan(supabase, userId, plan, customerId)
        }
        break
      }

      // ── Subscription cancelled → downgrade to free ─────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const userId = subscription.metadata?.supabase_user_id
          || await findUserByStripeCustomer(supabase, customerId)

        if (userId) {
          await setUserPlan(supabase, userId, 'free')
        } else {
          console.error('[stripe-webhook] Could not find user for customer:', customerId)
        }
        break
      }

      // ── Payment failed → log but don't downgrade yet ───────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.warn(`[stripe-webhook] Payment failed for subscription ${invoice.subscription}`)
        // TODO: send email via Resend to notify user
        break
      }

      // ── Trial will end in 3 days ──────────────────────────────────────────
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        const plan = subscription.metadata?.plan
        console.log(`[stripe-webhook] Trial ending soon for user ${userId} on plan ${plan} — subscription ${subscription.id}`)
        // TODO: send reminder email via Resend
        break
      }

      // ── Subscription created (covers trial start) ─────────────────────────
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        const plan = subscription.metadata?.plan
        const customerId = subscription.customer as string
        if (userId && plan) {
          // Activate plan immediately — trialing users get full access
          await setUserPlan(supabase, userId, plan, customerId)
          console.log(`[stripe-webhook] Subscription created — plan "${plan}" active (status: ${subscription.status}) for user ${userId}`)
        }
        break
      }

      // ── Unhandled events ───────────────────────────────────────────────────
      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('[stripe-webhook] Handler error:', err)
    return new Response(
      `Handler Error: ${err.message}`,
      { status: 500 },
    )
  }
})
