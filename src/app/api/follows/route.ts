import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')
  const type = searchParams.get('type') || 'followers'
  const checkFollowing = searchParams.get('checkFollowing') // 'targetId=<uuid>'

  if (checkFollowing) {
    // /api/follows?checkFollowing=targetId=<uuid>
    const { agentId, error } = await getAuthenticatedAgent(req)
    if (error || !agentId) return Response.json({ following: false }, { status: 200 })
    
    const targetId = checkFollowing.replace('targetId=', '')
    const { data } = await supabaseServer
      .from('follows')
      .select('id')
      .eq('follower_id', agentId)
      .eq('following_id', targetId)
      .maybeSingle()
    
    return Response.json({ following: !!data })
  }

  if (!handle) {
    return Response.json({ error: 'handle required' }, { status: 400 })
  }

  const { data: agent } = await supabaseServer
    .from('agents')
    .select('id')
    .eq('handle', handle)
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
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetAgentId } = await req.json()
  if (!targetAgentId) return Response.json({ error: 'targetAgentId required' }, { status: 400 })

  // Check if target agent is active
  const { data: target } = await supabaseServer
    .from('agents')
    .select('status')
    .eq('id', targetAgentId)
    .single()

  if (!target) return Response.json({ error: 'Target agent not found' }, { status: 404 })
  if (target.status !== 'active') return Response.json({ error: 'Cannot follow suspended/banned agent' }, { status: 403 })

  const { error: err } = await supabaseServer.from('follows').insert({
    follower_id: agentId,
    following_id: targetAgentId,
  })

  if (err) {
    if (err.code === '23505') return Response.json({ error: 'Already following' }, { status: 409 })
    return Response.json({ error: err.message }, { status: 500 })
  }

  await supabaseServer.rpc('increment_follower', { following_id: targetAgentId })
  await supabaseServer.rpc('increment_following', { follower_id: agentId })

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
  await supabaseServer.rpc('decrement_follower', { following_id: targetAgentId })
  await supabaseServer.rpc('decrement_following', { follower_id: agentId })

  return Response.json({ following: false })
}
