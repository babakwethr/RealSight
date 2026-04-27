import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Plan definitions — amounts in USD cents.
// Per LAUNCH_PLAN.md §2: launch pricing is $4 / $99. Once we cross the founder cap
// (1,000 signups) prices step to $9 / $199; founders keep their locked-in price.
// At launch every signup gets the launch price; founder lock-in protects them when
// we raise prices later.
//
// LEGACY KEYS (`portfolio_pro`, `adviser_starter`) still resolve here so any old
// links / autoresponders mid-flight don't 400; they map to the closest new plan.
const PLANS = {
  // ── Launch (current) ────────────────────────────────────────────────────────
  investor_pro: {
    name:        'Investor Pro',
    description: 'Live unit availability for every off-plan project — direct from developer feeds.',
    amount:      400,    // $4/mo launch promo
    interval:    'month' as const,
  },
  adviser_pro: {
    name:        'Adviser Pro',
    description: 'White-label platform: subdomain, branding, invite clients, branded reports, opportunity signals, bulk Deal Analyzer.',
    amount:      9900,   // $99/mo launch promo (6 months, then $199)
    interval:    'month' as const,
  },
  // ── Legacy (still accepted; routed to nearest launch tier) ─────────────────
  portfolio_pro: {
    name:        'Investor Pro',
    description: 'Live unit availability — formerly Portfolio Pro.',
    amount:      400,
    interval:    'month' as const,
  },
  adviser_starter: {
    name:        'Adviser Pro',
    description: 'White-label platform — formerly Adviser Starter.',
    amount:      9900,
    interval:    'month' as const,
  },
} as const

/** Normalise legacy plan keys onto the current launch tier name. */
function normalizePlanKey(plan: string): 'investor_pro' | 'adviser_pro' {
  if (plan === 'adviser_pro' || plan === 'adviser_starter' || plan === 'brokerage') return 'adviser_pro'
  return 'investor_pro'
}

type PlanKey = keyof typeof PLANS

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Authenticate user ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Unauthorized')

    // ── Parse request body ─────────────────────────────────────────────────────
    const { plan, success_url, cancel_url } = await req.json()

    if (!plan || !PLANS[plan as PlanKey]) {
      throw new Error(`Invalid plan: "${plan}". Must be one of: ${Object.keys(PLANS).join(', ')}`)
    }

    const planConfig = PLANS[plan as PlanKey]
    const normalizedPlan = normalizePlanKey(plan as string)
    const origin = req.headers.get('origin') || 'https://realsight.app'

    // Pull referral code from user_metadata if present (set at signup by useAuth.signUp).
    // We pass it into Stripe metadata so the webhook can credit both sides on first paid month.
    const referredBy = (user.user_metadata?.referred_by as string | undefined)?.toUpperCase() || null

    // ── Get or create Stripe customer ──────────────────────────────────────────
    let stripeCustomerId: string | undefined = user.user_metadata?.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      // Persist the customer id in user metadata
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, stripe_customer_id: stripeCustomerId },
      })
    }

    // ── Check if user has already used the trial ──────────────────────────────
    // One trial per customer. Stripe tracks this via the customer.
    const existingSubs = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status:   'all',
      limit:    10,
    })
    const hasUsedTrial = existingSubs.data.some(s =>
      s.trial_end !== null || s.status === 'trialing' || s.status === 'active' || s.status === 'past_due'
    )

    // ── Create checkout session ────────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer:             stripeCustomerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     'usd',
          product_data: {
            name:        `RealSight ${planConfig.name}`,
            description: planConfig.description,
          },
          unit_amount: planConfig.amount,
          recurring:   { interval: planConfig.interval },
        },
        quantity: 1,
      }],
      // Used in webhook to identify the user
      client_reference_id: user.id,
      metadata: {
        plan: normalizedPlan,
        user_id: user.id,
        ...(referredBy ? { referred_by: referredBy } : {}),
      },
      success_url: success_url || `${origin}/billing?upgraded=1`,
      cancel_url:  cancel_url  || `${origin}/billing`,
      allow_promotion_codes:            true,
      billing_address_collection:       'auto',
      subscription_data: {
        metadata: {
          plan: normalizedPlan,
          supabase_user_id: user.id,
          ...(referredBy ? { referred_by: referredBy } : {}),
        },
        // 30-day free trial for new customers only — one trial per account
        ...(hasUsedTrial ? {} : { trial_period_days: 30 }),
        // Cancel instead of charging if no payment method captured at trial end
        trial_settings: hasUsedTrial ? undefined : {
          end_behavior: { missing_payment_method: 'cancel' },
        },
      },
      // Still ask for payment method up front so card is on file when trial ends
      payment_method_collection: 'always',
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('[create-checkout-session]', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
