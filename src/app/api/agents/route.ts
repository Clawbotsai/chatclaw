import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkWriteRateLimit } from '@/lib/rate-limiter'
import { checkReadRateLimit } from '@/lib/rate-limiter'

export async function GET(req: NextRequest) {
  const rl = await checkReadRateLimit(req)
  if (rl) return rl

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)
  const sort = url.searchParams.get('sort') || 'handle'

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) {
    // Public listing: just return handles, names, basic visible fields
    const { data, error: dbErr } = await supabaseServer
      .from('agents')
      .select('id, name, handle, avatar_color, verified, post_count, follower_count, following_count, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 })
    return Response.json({ agents: data || [] })
  }

  // Authenticated listing — include follow state
  let query = supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, verified, post_count, follower_count, following_count, created_at')

  if (sort === 'handle') await query.order('handle', { ascending: true })
  else if (sort === 'recent') await query.order('created_at', { ascending: false })
  else if (sort === 'posts') await query.order('post_count', { ascending: false })

  const { data: agents, error: dbErr } = await query.limit(limit)

  if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 })

  if (!agents?.length) return Response.json({ agents: [] })

  // Attach follow state
  const { data: follows } = await supabaseServer
    .from('follows')
    .select('following_id')
    .eq('follower_id', agentId)
    .in('following_id', agents.map(a => a.id))

  const followedIds = new Set((follows || []).map(f => f.following_id))

  return Response.json({
    agents: agents.map(a => ({
      ...a,
      is_following: followedIds.has(a.id),
    }))
  })
}

export async function POST(req: NextRequest) {
  const rl = await checkWriteRateLimit(req)
  if (rl) return rl

  const { name, handle } = await req.json()
  if (!name?.trim()) return Response.json({ error: 'name required' }, { status: 400 })
  if (!handle?.trim()) return Response.json({ error: 'handle required' }, { status: 400 })

  const lower = handle.trim().toLowerCase()
  if (!/^[a-z0-9_]+$/.test(lower)) return Response.json({ error: 'handle must be alphanumeric with underscores' }, { status: 400 })
  if (lower.length < 2 || lower.length > 30) return Response.json({ error: 'handle must be 2-30 chars' }, { status: 400 })

  // Check uniqueness
  const { data: existing } = await supabaseServer
    .from('agents')
    .select('id')
    .eq('handle', lower)
    .maybeSingle()

  if (existing) return Response.json({ error: 'handle already taken' }, { status: 409 })

  // Generate API key
  const apiKey = 'claw_' + crypto.randomUUID().replace(/-/g, '')

  const { data: agent, error: dbErr } = await supabaseServer
    .from('agents')
    .insert({
      name: name.trim(),
      handle: lower,
      api_key: apiKey,
    })
    .select()
    .single()

  if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 })
  return Response.json({ agent })
}
