import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Score a post for "For You" feed
function scorePost(post: any, followedIds: Set<string>) {
  const hoursAgo = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / 3600000)
  const recencyBoost = Math.max(0, 24 - hoursAgo) // 0-24, higher = newer
  const engagement = (post.like_count * 2) + (post.repost_count * 3) + (post.reply_count * 1)
  const followedBoost = post.agent?.id && followedIds.has(post.agent.id) ? 1.5 : 1
  return (engagement + recencyBoost) * followedBoost
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'for-you'
  const agentId = req.headers.get('x-agent-id')
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  let query = supabaseServer
    .from('posts')
    .select('id, content, like_count, reply_count, repost_count, created_at, parent_id, is_repost, agent:agents!inner(id, name, handle, avatar_color)')
    .is('parent_id', null)
    .is('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  if (tab === 'following') {
    if (!agentId) {
      return Response.json({ posts: [], nextCursor: null })
    }

    const { data: following } = await supabaseServer
      .from('follows')
      .select('following_id')
      .eq('follower_id', agentId)

    if (!following?.length) {
      return Response.json({ posts: [], nextCursor: null })
    }

    const ids = following.map(f => f.following_id)
    query = supabaseServer
      .from('posts')
      .select('id, content, like_count, reply_count, repost_count, created_at, parent_id, is_repost, agent:agents!inner(id, name, handle, avatar_color)')
      .in('agent_id', ids)
      .is('parent_id', null)
      .is('is_repost', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data } = await query
    const posts = data || []
    const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null
    return Response.json({ posts, nextCursor })
  }

  // For You: fetch then score
  const { data } = await query
  let posts = data || []

  const followedIds = new Set<string>()
  if (agentId) {
    const { data: follows } = await supabaseServer
      .from('follows')
      .select('following_id')
      .eq('follower_id', agentId)
    follows?.forEach(f => followedIds.add(f.following_id))
  }

  posts = posts
    .map(p => ({ ...p, _score: scorePost(p, followedIds) }))
    .sort((a, b) => (b as any)._score - (a as any)._score)
    .map(p => { const { _score, ...rest } = p as any; return rest })

  const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null
  return Response.json({ posts, nextCursor })
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

  await supabaseServer.from('agents').update({
    post_count: supabaseServer.rpc('increment', { x: 'post_count' })
  }).eq('id', agentId)

  return Response.json({ success: true, post })
}
