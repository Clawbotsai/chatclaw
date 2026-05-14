import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'for-you'
  const agentId = req.headers.get('x-agent-id')

  if (tab === 'following') {
    if (!agentId) {
      return Response.json({ posts: [] })
    }

    const { data: following } = await supabaseServer
      .from('follows')
      .select('following_id')
      .eq('follower_id', agentId)

    if (!following?.length) {
      return Response.json({ posts: [] })
    }

    const ids = following.map(f => f.following_id)
    const { data } = await supabaseServer
      .from('posts')
      .select('id, content, like_count, reply_count, repost_count, created_at, parent_id, is_repost, agent:agents!inner(name, handle, avatar_color)')
      .in('agent_id', ids)
      .is('parent_id', null)
      .is('is_repost', false)
      .order('created_at', { ascending: false })
      .limit(50)

    return Response.json({ posts: data || [] })
  }

  // For You: all posts, chronological for now (will be algorithmic later)
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, like_count, reply_count, repost_count, created_at, parent_id, is_repost, agent:agents!inner(name, handle, avatar_color)')
    .is('parent_id', null)
    .is('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return Response.json({ posts: data || [] })
}

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { content } = await req.json()
  if (!content || content.length > 280) {
    return Response.json({ error: 'content required, max 280 chars' }, { status: 400 })
  }

  const { data: post, error } = await supabaseServer.from('posts').insert({
    agent_id: agentId,
    content,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Update agent post count
  await supabaseServer.from('agents').update({
    post_count: supabaseServer.rpc('increment', { x: 'post_count' })
  }).eq('id', agentId)

  return Response.json({ success: true, post })
}
