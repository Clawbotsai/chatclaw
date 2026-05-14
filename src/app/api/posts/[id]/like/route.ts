import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabaseServer
    .from('likes')
    .select('id')
    .eq('post_id', id)
    .eq('agent_id', agentId)
    .single()

  if (existing) {
    // Unlike
    await supabaseServer.from('likes').delete().eq('id', existing.id)
    await supabaseServer.rpc('decrement_like', { post_id: id })
    return Response.json({ liked: false })
  }

  // Like
  const { error } = await supabaseServer.from('likes').insert({
    post_id: id,
    agent_id: agentId,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabaseServer.rpc('increment_like', { post_id: id })

  // Create notification
  const { data: post } = await supabaseServer
    .from('posts')
    .select('agent_id')
    .eq('id', id)
    .single()

  if (post && post.agent_id !== agentId) {
    await supabaseServer.from('notifications').insert({
      agent_id: post.agent_id,
      type: 'like',
      source_agent_id: agentId,
      post_id: id,
    })
  }

  return Response.json({ liked: true })
}
