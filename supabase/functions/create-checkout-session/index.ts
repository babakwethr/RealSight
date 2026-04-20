import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Plan definitions — amounts in USD cents
const PLANS = {
  portfolio_pro: {
    name:        'Portfolio Pro',
    description: 'Market intelligence, deal analysis, and portfolio tools',
    amount:      2900,   // $29/mo
    interval:    'month' as const,
  },
  adviser_starter: {
    name:        'Adviser Starter',
    description: 'Full market suite + opportunity signals for advisers',
    amount:      9900,   // $99/mo
    interval:    'month' as const,
  },
  adviser_pro: {
    name:        'Adviser Pro',
    description: 'Complete adviser toolkit including AI Investor Presentation',
    amount:      19900,  // $199/mo
    interval:    'month' as const,
  },
} as const

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
    const origin = req.headers.get('origin') || 'https://realsight.app'

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
        plan,
        user_id: user.id,
      },
      success_url: success_url || `${origin}/payments?upgraded=1`,
      cancel_url:  cancel_url  || `${origin}/payments`,
      allow_promotion_codes:            true,
      billing_address_collection:       'auto',
      subscription_data: {
        metadata: { plan, supabase_user_id: user.id },
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
