import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

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
  await supabaseServer.from('likes').insert({ post_id: id, agent_id: agentId })
  await supabaseServer.rpc('increment_like', { post_id: id })

  // Notify post author
  const { data: post } = await supabaseServer.from('posts').select('agent_id').eq('id', id).single()
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
