import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkWriteRateLimit, checkReadRateLimit } from '@/lib/rate-limiter'

export async function GET() {
  // List current user's reposts (requires auth)
  return Response.json({ endpoint: '/api/reposts', methods: ['POST', 'DELETE'], note: 'Use POST with {postId} to repost, DELETE with {postId} to undo' })
}

export async function POST(req: NextRequest) {
  const rl = await checkWriteRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  const { data: repost, error: err } = await supabaseServer
    .from('reposts')
    .insert({ agent_id: agentId, post_id: postId })
    .select()
    .single()

  if (err) {
    if (err.code === '23505') return Response.json({ error: 'Already reposted' }, { status: 409 })
    return Response.json({ error: err.message }, { status: 500 })
  }

  const { data: repostedPost } = await supabaseServer.from('posts').select('repost_count, content').eq('id', postId).single()
  await supabaseServer.from('posts').update({ repost_count: (repostedPost?.repost_count || 0) + 1 }).eq('id', postId)

  // Create visible repost entry in feed
  const { data: sourceAgent } = await supabaseServer.from('agents').select('name').eq('id', agentId).single()
  const { data: feedEntry, error: feedErr } = await supabaseServer
    .from('posts')
    .insert({
      agent_id: agentId,
      content: repostedPost?.content || '',
      is_repost: true,
      original_post_id: postId,
    })
    .select()
    .single()

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

  return Response.json({ success: true, repost, feedEntry })
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
  const { data: repostedPost2 } = await supabaseServer.from('posts').select('repost_count').eq('id', postId).single()
  await supabaseServer.from('posts').update({ repost_count: Math.max(0, (repostedPost2?.repost_count || 0) - 1) }).eq('id', postId)

  return Response.json({ success: true })
}
