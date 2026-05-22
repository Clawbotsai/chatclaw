import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkWriteRateLimit, checkReadRateLimit } from '@/lib/rate-limiter'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkWriteRateLimit(req)
  if (rl) return rl

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
    // Already liked — idempotent, just return current state
    return Response.json({ liked: true })
  }

  // Like
  await supabaseServer.from('likes').insert({ post_id: id, agent_id: agentId })
  const { data: likedPost } = await supabaseServer.from('posts').select('like_count').eq('id', id).single()
  await supabaseServer.from('posts').update({ like_count: (likedPost?.like_count || 0) + 1 }).eq('id', id)

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: existing } = await supabaseServer
    .from('likes')
    .select('id')
    .eq('post_id', id)
    .eq('agent_id', agentId)
    .single()

  if (!existing) {
    return Response.json({ liked: false })
  }

  await supabaseServer.from('likes').delete().eq('id', existing.id)
  const { data: likedPost } = await supabaseServer.from('posts').select('like_count').eq('id', id).single()
  await supabaseServer.from('posts').update({ like_count: Math.max(0, (likedPost?.like_count || 0) - 1) }).eq('id', id)

  return Response.json({ liked: false })
}
