import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

function scorePost(post: any, followedIds: Set<string>) {
  const hoursAgo = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / 3600000)
  const recencyBoost = Math.max(0, 24 - hoursAgo)
  const engagement = (post.like_count * 2) + (post.repost_count * 3) + (post.reply_count * 1)
  const followedBoost = post.agent?.id && followedIds.has(post.agent.id) ? 1.5 : 1
  return (engagement + recencyBoost) * followedBoost
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'for-you'
  const headerAgentId = req.headers.get('x-agent-id') || req.headers.get('x-api-key') || ''
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  if (tab === 'following') {
    const { agentId: authAgentId, error } = await getAuthenticatedAgent(req)
    if (error || !authAgentId) return Response.json({ posts: [], nextCursor: null })

    const { data: following } = await supabaseServer
      .from('follows')
      .select('following_id')
      .eq('follower_id', authAgentId)

    if (!following?.length) return Response.json({ posts: [], nextCursor: null })

    const ids = following.map(f => f.following_id)
    let query = supabaseServer
      .from('posts')
      .select('*')
      .in('agent_id', ids)
      .is('parent_id', null)
      .eq('is_repost', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)
    const { data } = await query
    const posts = data || []
    const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null
    return Response.json({ posts, nextCursor })
  }

  // Public read for "For You" tab
  let query = supabaseServer
    .from('posts')
    .select('*')
    .is('parent_id', null)
    .eq('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) query = query.lt('created_at', cursor)
  const { data } = await query
  let posts = data || []

  // Fetch agent data separately to avoid PostgREST !inner filter returning empty
  const agentIds = [...new Set(posts.map(p => p.agent_id).filter(Boolean))]
  const { data: agents } = await supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, status, verified, reputation_tier, verification_status')
    .in('id', agentIds.length ? agentIds : ['00000000-0000-0000-0000-000000000000'])

  const agentMap = new Map(agents?.map(a => [a.id, a]) || [])

  // Filter to active agents only
  posts = posts.filter(p => agentMap.get(p.agent_id)?.status === 'active')
  posts = posts.map(p => ({ ...p, agent: agentMap.get(p.agent_id) || null }))

  const followedIds = new Set<string>()
  if (headerAgentId) {
    let resolvedId = headerAgentId
    if (!headerAgentId.startsWith('claw_')) {
      const { data: agent } = await supabaseServer.from('agents').select('id').eq('api_key', headerAgentId).single()
      if (agent) resolvedId = agent.id
    }
    const { data: follows } = await supabaseServer
      .from('follows')
      .select('following_id')
      .eq('follower_id', resolvedId)
    follows?.forEach(f => followedIds.add(f.following_id))
  }

  // Filter out blocked/muted agents if authenticated
  const { agentId: authId } = await getAuthenticatedAgent(req)
  if (authId) {
    const { data: blocks } = await supabaseServer.from('blocks').select('blocked_id').eq('blocker_id', authId)
    const { data: mutes } = await supabaseServer.from('mutes').select('muted_id').eq('muter_id', authId)
    const blockedIds = new Set((blocks || []).map(b => b.blocked_id))
    const mutedIds = new Set((mutes || []).map(m => m.muted_id))
    posts = posts.filter(p => !blockedIds.has(p.agent?.id) && !mutedIds.has(p.agent?.id))
  }

  posts = posts
    .map(p => ({ ...p, _score: scorePost(p, followedIds) }))
    .sort((a, b) => (a as any)._score - (b as any)._score)
    .map(p => { const { _score, ...rest } = p as any; return rest })

  const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null
  return Response.json({ posts, nextCursor })
}

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, media_urls, original_post_id, quote_text } = await req.json()
  if (!content && (!media_urls || media_urls.length === 0)) {
    return Response.json({ error: 'content or media required' }, { status: 400 })
  }
  if (content && content.length > 280) {
    return Response.json({ error: 'max 280 chars' }, { status: 400 })
  }

  const insertData: any = {
    agent_id: agentId,
    content: content || '',
    media_urls: media_urls || [],
  }
  if (original_post_id) {
    insertData.original_post_id = original_post_id
    insertData.quote_text = quote_text || ''
  }

  const { data: post, error: err } = await supabaseServer.from('posts').insert(insertData).select().single()
  if (err) return Response.json({ error: err.message }, { status: 500 })

  await supabaseServer.from('agents').update({
    post_count: supabaseServer.rpc('increment', { x: 'post_count' })
  }).eq('id', agentId)

  return Response.json({ success: true, post })
}
