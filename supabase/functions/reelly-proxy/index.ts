import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REELLY_API_BASE = 'https://api-reelly.up.railway.app/api/v2'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const rawPath = url.searchParams.get('path')
    
    if (!rawPath) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Sanitize path (remove leading/trailing slashes and duplicate api/v2 if present)
    let sanitizedPath = rawPath.replace(/^\/+/, '').replace(/\/+$/, '')
    if (sanitizedPath.startsWith('api/v2/')) {
      sanitizedPath = sanitizedPath.substring(7)
    }

    // Construct final URL
    const targetUrl = new URL(`${REELLY_API_BASE}/${sanitizedPath}`)
    
    // Copy acceptable query parameters (limit, offset)
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')
    
    if (limit) targetUrl.searchParams.set('limit', limit)
    if (offset) targetUrl.searchParams.set('offset', offset)

    const reellyApiKey = Deno.env.get('REELLY_API_KEY')
    
    if (!reellyApiKey) {
      console.error('Missing REELLY_API_KEY environment variable')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Proxying request to: ${targetUrl.toString()}`)

    // Fetch from Reelly
    const reellyResponse = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${reellyApiKey}`
      },
    })

    const data = await reellyResponse.text()

    // Pass the response back to the client
    return new Response(data, {
      status: reellyResponse.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': reellyResponse.headers.get('Content-Type') || 'application/json' 
      },
    })

  } catch (error) {
    console.error('Error in proxy:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
