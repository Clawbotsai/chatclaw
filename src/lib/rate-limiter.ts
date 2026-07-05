import { NextRequest } from 'next/server'
import { supabaseServer } from './supabase-server'

interface RateLimitWindow {
  count: number
  resetAt: number
}

// In-memory cache for burst protection (single-server deploy OK; swap for Redis later)
const ipWindows = new Map<string, RateLimitWindow>()
const agentWindows = new Map<string, RateLimitWindow>()

function isWindowExpired(w: RateLimitWindow) {
  return Date.now() > w.resetAt
}

function getWindow(map: Map<string, RateLimitWindow>, key: string, windowMs: number): RateLimitWindow {
  const now = Date.now()
  let w = map.get(key)
  if (!w || isWindowExpired(w)) {
    w = { count: 0, resetAt: now + windowMs }
    map.set(key, w)
  }
  w.count++
  return w
}

function makeRLResponse(w: RateLimitWindow, limit: number) {
  const retryAfter = Math.ceil((w.resetAt - Date.now()) / 1000)
  return Response.json(
    { error: 'Rate limit exceeded', retryAfter },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(Math.max(0, limit - w.count)),
        'X-RateLimit-Reset': String(Math.ceil(w.resetAt / 1000)),
        'Retry-After': String(retryAfter),
      },
    }
  )
}

export interface RateLimitConfig {
  ipLimit?: number      // requests per window for unauthenticated IPs
  agentLimit?: number   // requests per window for authenticated agents
  windowMs?: number     // sliding window size (default 60s)
}

/**
 * Check rate limit for a request.
 * Returns `null` if allowed, otherwise returns a 429 Response.
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig = {}
): Promise<Response | null> {
  const { ipLimit = 120, agentLimit = 300, windowMs = 60000 } = config

  // Extract IP (works behind Vercel/nginx)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'

  const agentId = req.headers.get('x-agent-id')
  const apiKey = req.headers.get('x-api-key')

  // Resolve agent_id from API key if needed
  let resolvedAgentId = agentId
  if (!resolvedAgentId && apiKey) {
    const { data } = await supabaseServer.from('agents').select('id').eq('api_key', apiKey).single()
    if (data) resolvedAgentId = data.id
  }

  // Check if agent is banned/suspended
  if (resolvedAgentId) {
    const { data: agent } = await supabaseServer
      .from('agents')
      .select('status')
      .eq('id', resolvedAgentId)
      .single()

    if (agent?.status === 'banned') {
      return Response.json(
        { error: 'Account banned. Contact admin@chatclaw.com' },
        { status: 403 }
      )
    }
    if (agent?.status === 'suspended') {
      return Response.json(
        { error: 'Account suspended. Contact admin@chatclaw.com' },
        { status: 403 }
      )
    }

    // Per-agent limit
    const w = getWindow(agentWindows, resolvedAgentId, windowMs)
    if (w.count > agentLimit) {
      return makeRLResponse(w, agentLimit)
    }
    return null
  }

  // IP-based limit for unauthenticated requests
  const w = getWindow(ipWindows, ip, windowMs)
  if (w.count > ipLimit) {
    return makeRLResponse(w, ipLimit)
  }
  return null
}

/**
 * Stricter rate limit for write-heavy endpoints (posts, messages, follows)
 */
export async function checkWriteRateLimit(req: NextRequest): Promise<Response | null> {
  return checkRateLimit(req, { ipLimit: 60, agentLimit: 120, windowMs: 60000 })
}

/**
 * Moderate rate limit for read endpoints
 */
export async function checkReadRateLimit(req: NextRequest): Promise<Response | null> {
  return checkRateLimit(req, { ipLimit: 200, agentLimit: 500, windowMs: 60000 })
}

// Cleanup expired windows every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of ipWindows) { if (v.resetAt < now) ipWindows.delete(k) }
  for (const [k, v] of agentWindows) { if (v.resetAt < now) agentWindows.delete(k) }
}, 300000)
