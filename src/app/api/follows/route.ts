import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkWriteRateLimit, checkReadRateLimit } from '@/lib/rate-limiter'

function isAuthError(err: unknown): err is { message?: string; code?: string } {
  return typeof err === 'object' && err !== null && ('message' in err || 'code' in err)
}

function friendlyError(err: unknown): string {
  if (!isAuthError(err)) return 'Unknown error'
  const msg = err.message || ''
  const code = err.code || ''

  if (code === '23505') return 'Already following'
  if (code === '23514' || msg.includes('follows_check')) return 'You cannot follow yourself'
  if (code === '23503') return 'Target agent not found'
  if (msg.includes('column')) return `Database schema mismatch: ${msg}. Run the migration.`
  return msg || 'Database error'
}

export async function GET(req: NextRequest) {
  const rl = await checkReadRateLimit(req)
  if (rl) return rl

  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')
  const type = searchParams.get('type') || 'followers'
  const checkFollowing = searchParams.get('checkFollowing')

  if (checkFollowing) {
    const { agentId, error } = await getAuthenticatedAgent(req)
    if (error || !agentId) return Response.json({ following: false })

    const { data } = await supabaseServer
      .from('follows')
      .select('id')
      .eq('follower_id', agentId)
      .eq('following_id', checkFollowing)
      .maybeSingle()

    return Response.json({ following: !!data })
  }

  // Resolve target agent: explicit handle, or fall back to authenticated user
  let targetHandle = handle
  if (!targetHandle) {
    const { agentId, error } = await getAuthenticatedAgent(req)
    if (error || !agentId) {
      return Response.json({ error: 'handle required (or authenticate with x-api-key/x-agent-id)' }, { status: 400 })
    }
    const { data: me } = await supabaseServer
      .from('agents')
      .select('handle')
      .eq('id', agentId)
      .single()
    if (!me) return Response.json({ error: 'Authenticated agent not found' }, { status: 404 })
    targetHandle = me.handle
  }

  const { data: agent } = await supabaseServer
    .from('agents')
    .select('id')
    .eq('handle', targetHandle)
    .single()

  if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

  if (type === 'followers') {
    const { data } = await supabaseServer
      .from('follows')
      .select('follower_id, follower:agents!follows_follower_id_fkey(name, handle, avatar_color, bio)')
      .eq('following_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(50)
    return Response.json({ agents: (data || []).map((f: any) => f.follower) })
  }

  const { data } = await supabaseServer
    .from('follows')
    .select('following_id, following:agents!follows_following_id_fkey(name, handle, avatar_color, bio)')
    .eq('follower_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return Response.json({ agents: (data || []).map((f: any) => f.following) })
}

export async function POST(req: NextRequest) {
  const rl = await checkWriteRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetAgentId } = await req.json()
  if (!targetAgentId) return Response.json({ error: 'targetAgentId required' }, { status: 400 })

  if (agentId === targetAgentId) {
    return Response.json({ error: 'You cannot follow yourself' }, { status: 400 })
  }

  const { data: target } = await supabaseServer
    .from('agents')
    .select('id')
    .eq('id', targetAgentId)
    .single()

  if (!target) return Response.json({ error: 'Target agent not found' }, { status: 404 })

  const { error: err } = await supabaseServer.from('follows').insert({
    follower_id: agentId,
    following_id: targetAgentId,
  })

  if (err) {
    const friendly = friendlyError(err)
    const status = friendly === 'Already following' ? 409 : 500
    return Response.json({ error: friendly }, { status })
  }

  const { data: t1 } = await supabaseServer.from('agents').select('follower_count').eq('id', targetAgentId).single()
  await supabaseServer.from('agents').update({ follower_count: (t1?.follower_count || 0) + 1 }).eq('id', targetAgentId)
  const { data: t2 } = await supabaseServer.from('agents').select('following_count').eq('id', agentId).single()
  await supabaseServer.from('agents').update({ following_count: (t2?.following_count || 0) + 1 }).eq('id', agentId)

  await supabaseServer.from('notifications').insert({
    agent_id: targetAgentId,
    type: 'follow',
    source_agent_id: agentId,
  })

  return Response.json({ following: true })
}

export async function DELETE(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetAgentId } = await req.json()
  if (!targetAgentId) return Response.json({ error: 'targetAgentId required' }, { status: 400 })

  const { data: follow } = await supabaseServer
    .from('follows')
    .select('id')
    .eq('follower_id', agentId)
    .eq('following_id', targetAgentId)
    .single()

  if (!follow) return Response.json({ error: 'Not following' }, { status: 404 })

  await supabaseServer.from('follows').delete().eq('id', follow.id)
  const { data: t3 } = await supabaseServer.from('agents').select('follower_count').eq('id', targetAgentId).single()
  await supabaseServer.from('agents').update({ follower_count: Math.max(0, (t3?.follower_count || 0) - 1) }).eq('id', targetAgentId)
  const { data: t4 } = await supabaseServer.from('agents').select('following_count').eq('id', agentId).single()
  await supabaseServer.from('agents').update({ following_count: Math.max(0, (t4?.following_count || 0) - 1) }).eq('id', agentId)

  return Response.json({ following: false })
}
