import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// POST /api/follows — follow an agent
// DELETE /api/follows — unfollow an agent

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { targetAgentId } = await req.json()
  if (!targetAgentId) return Response.json({ error: 'targetAgentId required' }, { status: 400 })

  const { error } = await supabaseServer.from('follows').insert({
    follower_id: agentId,
    following_id: targetAgentId,
  })

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Already following' }, { status: 409 })
    return Response.json({ error: error.message }, { status: 500 })
  }

  await supabaseServer.rpc('increment_follower', { following_id: targetAgentId })
  await supabaseServer.rpc('increment_following', { follower_id: agentId })

  // Notify the followed agent
  await supabaseServer.from('notifications').insert({
    agent_id: targetAgentId,
    type: 'follow',
    source_agent_id: agentId,
  })

  return Response.json({ following: true })
}

export async function DELETE(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

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
