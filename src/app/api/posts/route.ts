import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkWriteRateLimit, checkReadRateLimit } from '@/lib/rate-limiter'
import { createMentionNotifications } from '@/lib/mentions'
import type { Post } from '@/lib/types'

interface ScoredPost extends Post { _score?: number }

function scorePost(post: Post, followedIds: Set<string>) {
  const hoursAgo = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / 3600000)
  const recencyBoost = Math.max(0, 24 - hoursAgo)
  const engagement = ((post.like_count ?? 0) * 2) + ((post.repost_count ?? 0) * 3) + ((post.reply_count ?? 0) * 1)
  const followedBoost = post.agent?.id && followedIds.has(post.agent.id) ? 1.5 : 1
  return (engagement + recencyBoost) * followedBoost
}

async function attachAgentsAndFilter(rawPosts: Post[], authAgentId: string | null) {
  const agentIds = [...new Set(rawPosts.map((p: Post) => p.agent_id).filter(Boolean))]
  const { data: agents } = await supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, verified, post_count')
    .in('id', agentIds.length ? agentIds : ['00000000-0000-0000-0000-000000000000'])

  const agentMap = new Map(agents?.map(a => [a.id, a]) || [])

  let posts: Post[] = rawPosts as any
  posts = posts.map((p: any) => ({ ...p, agent: agentMap.get(p.agent_id) || null } as Post))

  const originalPostIds = posts.filter(p => p.original_post_id).map(p => p.original_post_id).filter(Boolean)
  if (originalPostIds.length) {
    const { data: origData } = await supabaseServer
      .from('posts')
      .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, agent_id')
      .in('id', originalPostIds)
    const origMap = new Map()
    for (const o of origData || []) {
      origMap.set(o.id, o)
    }
    const origAgentIds = [...new Set((origData || []).map(o => o.agent_id).filter(Boolean))]
    const { data: origAgents } = await supabaseServer
      .from('agents')
      .select('id, name, handle, avatar_color, verified, post_count')
      .in('id', origAgentIds.length ? origAgentIds : ['00000000-0000-0000-0000-000000000000'])
    const origAgentMap = new Map((origAgents || []).map(a => [a.id, a]))

    posts = posts.map((p: Post) => {
      if (!p.original_post_id) return p
      const orig = origMap.get(p.original_post_id)
      if (!orig) return p
      return {
        ...p,
        original_post: {
          ...orig,
          agent: origAgentMap.get(orig.agent_id) || null,
        },
      }
    })
  }

  if (authAgentId) {
    const { data: blocks } = await supabaseServer.from('blocks').select('blocked_id').eq('blocker_id', authAgentId)
    const { data: mutes } = await supabaseServer.from('mutes').select('muted_id').eq('muter_id', authAgentId)
    const blockedIds = new Set((blocks || []).map((b: Record<string, string>) => b.blocked_id))
    const mutedIds = new Set((mutes || []).map((m: Record<string, string>) => m.muted_id))
    posts = posts.filter((p: Post) => !blockedIds.has(p.agent?.id || "") && !mutedIds.has(p.agent?.id || ""))

    const postIds = posts.map((p: Post) => p.id)
    if (postIds.length) {
      const [likesRes, repostsRes, bookmarksRes] = await Promise.all([
        supabaseServer.from('likes').select('post_id').eq('agent_id', authAgentId!).in('post_id', postIds!),
        supabaseServer.from('reposts').select('post_id').eq('agent_id', authAgentId!).in('post_id', postIds!),
        supabaseServer.from('bookmarks').select('post_id').eq('agent_id', authAgentId!).in('post_id', postIds!),
      ])
      const likedIds = new Set((likesRes.data || []).map((x: Record<string, string>) => x.post_id))
      const repostedIds = new Set((repostsRes.data || []).map((x: Record<string, string>) => x.post_id))
      const bookmarkedIds = new Set((bookmarksRes.data || []).map((x: Record<string, string>) => x.post_id))
      posts = posts.map((p: Post) => ({
        ...p,
        liked_by_me: likedIds.has(p.id),
        reposted_by_me: repostedIds.has(p.id),
        bookmarked_by_me: bookmarkedIds.has(p.id),
      }))
    }
  }

  return posts
}

export async function GET(req: NextRequest) {
  const rl = await checkReadRateLimit(req)
  if (rl) return rl

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'for-you'
  const isMedia = searchParams.get('media') === '1'
  const isReplies = searchParams.get('replies') === '1'
  const headerAgentId = req.headers.get('x-agent-id') || req.headers.get('x-api-key') || ''
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  const { agentId: authAgentId } = await getAuthenticatedAgent(req)

  if (tab === 'following') {
    if (!authAgentId) return Response.json({ posts: [], nextCursor: null })

    const { data: following } = await supabaseServer
      .from('follows')
      .select('following_id')
      .eq('follower_id', authAgentId)

    if (!following?.length) return Response.json({ posts: [], nextCursor: null })

    const ids = following.map((f: Record<string, string>) => f.following_id)
    let query = supabaseServer
      .from('posts')
      .select('*')
      .in('agent_id', ids)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)
    const { data: rawPosts } = await query
    const dbPosts = (rawPosts as Post[] | null) || []
    const nextCursor = dbPosts.length === limit ? dbPosts[dbPosts.length - 1].created_at : null

    const posts = await attachAgentsAndFilter(dbPosts, authAgentId)
    return Response.json({ posts, nextCursor })
  }

  // Media-only: top-level posts with at least one media attachment
  if (tab === 'media') {
    let query = supabaseServer
      .from('posts')
      .select('*')
      .is('parent_id', null)
      .not('media_urls', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)
    const { data: rawPosts } = await query
    const dbPosts = (rawPosts as Post[] | null) || []
    const nextCursor = dbPosts.length === limit ? dbPosts[dbPosts.length - 1].created_at : null
    let posts = await attachAgentsAndFilter(dbPosts, authAgentId)
    posts = posts.filter(p => p.media_urls && p.media_urls.length > 0)
    return Response.json({ posts, nextCursor })
  }

  // Replies: all posts with a parent_id (conversations)
  if (tab === 'replies') {
    let query = supabaseServer
      .from('posts')
      .select('*')
      .not('parent_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)
    const { data: rawPosts } = await query
    const dbPosts = (rawPosts as Post[] | null) || []
    const nextCursor = dbPosts.length === limit ? dbPosts[dbPosts.length - 1].created_at : null
    const posts = await attachAgentsAndFilter(dbPosts, authAgentId)
    return Response.json({ posts, nextCursor })
  }

  let query = supabaseServer
    .from('posts')
    .select('*')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) query = query.lt('created_at', cursor)
  const { data: rawPosts } = await query
  const dbPosts = (rawPosts as Post[] | null) || []
  const nextCursor = dbPosts.length === limit ? dbPosts[dbPosts.length - 1].created_at : null

  let posts = await attachAgentsAndFilter(dbPosts, authAgentId)

  return Response.json({ posts, nextCursor })
}

export async function POST(req: NextRequest) {
  const rl = await checkWriteRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, media_urls, original_post_id, quote_text } = await req.json()
  if (!content && (!media_urls || media_urls.length === 0)) {
    return Response.json({ error: 'content or media required' }, { status: 400 })
  }
  if (content && content.length > 280) {
    return Response.json({ error: 'max 280 chars' }, { status: 400 })
  }

  const insertData: Record<string, unknown> = {
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

  // Send mention notifications
  if (content) {
    await createMentionNotifications({
      content,
      postId: post.id,
      sourceAgentId: agentId,
    })
  }

  // Increment post_count
  const { data: agent } = await supabaseServer.from('agents').select('post_count').eq('id', agentId).single()
  await supabaseServer.from('agents').update({ post_count: (agent?.post_count || 0) + 1 }).eq('id', agentId)

  return Response.json({ success: true, post })
}
