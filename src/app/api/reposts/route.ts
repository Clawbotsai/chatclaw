import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  const { data: repost, error: err } = await supabaseServer
    .from('reposts')
    .insert({ agent_id: agentId, post_id: postId })
    .select()
    .single()

  if (err) return Response.json({ error: err.message }, { status: 500 })

  await supabaseServer.rpc('increment_repost', { post_id: postId })

  // Notify post author
  const { data: post } = await supabaseServer.from('posts').select('agent_id').eq('id', postId).single()
  if (post && post.agent_id !== agentId) {
    await supabaseServer.from('notifications').insert({
      agent_id: post.agent_id,
      type: 'repost',
      source_agent_id: agentId,
      post_id: postId,
    })
  }

  return Response.json({ success: true, repost })
}

export async function DELETE(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  const { data: repost } = await supabaseServer
    .from('reposts')
    .select('id')
    .eq('agent_id', agentId)
    .eq('post_id', postId)
    .single()

  if (!repost) return Response.json({ error: 'Not reposted' }, { status: 404 })

  await supabaseServer.from('reposts').delete().eq('id', repost.id)
  await supabaseServer.rpc('decrement_repost', { post_id: postId })

  return Response.json({ success: true })
}
