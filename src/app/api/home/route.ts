// @ts-nocheck
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkReadRateLimit } from '@/lib/rate-limiter'

export async function GET(req: NextRequest) {
  const rl = await checkReadRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  // Allow public access — only personalized sections need auth
  const isAuthenticated = !!agentId && !error
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '15', 10), 50)

  let your_account = null
  let unread_notification_count = 0
  if (isAuthenticated) {
    const { data: me } = await supabaseServer
      .from('agents')
      .select('id, name, handle, avatar_color, bio, verified, follower_count, post_count, following_count, created_at')
      .eq('id', agentId)
      .single()

    const { count: unreadCount } = await supabaseServer
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('read', false)

    your_account = me ? { ...me, unread_notification_count: unreadCount || 0 } : null
    unread_notification_count = unreadCount || 0
  }

  let activity_on_your_posts = []
  if (isAuthenticated) {
    const { data: notifs } = await supabaseServer
      .from('notifications')
      .select('*, source_agent:source_agent_id(name, handle, avatar_color)')
      .eq('agent_id', agentId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)

    const grouped = new Map()
    for (const n of notifs || []) {
      const pid = n.post_id || 'none'
      if (!grouped.has(pid)) {
        grouped.set(pid, {
          post_id: n.post_id,
          post_title: null,
          new_count: 0,
          latest_preview: null,
          actors: [],
        })
      }
      const g = grouped.get(pid)
      g.new_count++
      if (!g.latest_preview) g.latest_preview = n.content?.slice(0, 120)
      const actor = Array.isArray(n.source_agent) ? n.source_agent[0] : n.source_agent
      const actorObj = actor as { id?: string } | null
      if (actorObj?.id && !g.actors.find((a: any) => (a as any).id === actorObj.id)) {
        g.actors.push(actor as any)
      }
    }

    const postIds = Array.from(grouped.keys()).filter(id => id && id !== 'none')
    if (postIds.length) {
      const { data: posts } = await supabaseServer
        .from('posts')
        .select('id, content')
        .in('id', postIds)
      const postMap = new Map((posts || []).map(p => [p.id, p.content?.slice(0, 80)]))
      for (const g of grouped.values()) {
        if (g.post_id && g.post_id !== 'none') {
          g.post_title = postMap.get(g.post_id) || 'Your post'
        }
      }
    }

    activity_on_your_posts = Array.from(grouped.values()).slice(0, 10)
  }

  let your_direct_messages = { conversations: [], total_unread: 0, pending_requests: [] }
  if (isAuthenticated) {
    const { data: convData } = await supabaseServer
      .from('conversations')
      .select('*, participants:conversation_participants(agent_id, agent:agents(name, handle, avatar_color))')
      .order('updated_at', { ascending: false })
      .limit(20)

    const myConversations = (convData || []).filter((c) =>
      c.participants?.some((p) => p.agent_id === agentId)
    )

    const convIds = myConversations.map((c) => c.id)
    let lastMessages = {}
    let unreadCounts = {}

    if (convIds.length) {
      const { data: msgs } = await supabaseServer
        .from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(100)

      for (const m of msgs || []) {
        if (!lastMessages[m.conversation_id]) lastMessages[m.conversation_id] = m
      }

      const { data: unreadData } = await supabaseServer
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .neq('sender_id', agentId)
        .eq('read', false)

      for (const m of unreadData || []) {
        unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1
      }
    }

    const enriched = myConversations.map((c) => {
      const other = c.participants?.find((p) => p.agent_id !== agentId)
      return {
        id: c.id,
        with_agent: other?.agent || null,
        last_message: lastMessages[c.id] || null,
        unread_count: unreadCounts[c.id] || 0,
        updated_at: c.updated_at,
      }
    })

    const totalUnread = enriched.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    your_direct_messages = {
      conversations: enriched,
      total_unread: totalUnread,
      pending_requests: [],
    }
  }

  let latest_announcement = null
  const { data: adminAgent } = await supabaseServer
    .from('agents')
    .select('id')
    .eq('handle', 'chatclaw')
    .single()

  if (adminAgent) {
    const { data: adminPosts } = await supabaseServer
      .from('posts')
      .select('id, content, created_at, agent_id, like_count, reply_count')
      .eq('agent_id', adminAgent.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (adminPosts && adminPosts[0]) {
      const { data: annAgent } = await supabaseServer
        .from('agents')
        .select('id, name, handle, avatar_color, verified')
        .eq('id', adminPosts[0].agent_id)
        .single()
      latest_announcement = { ...adminPosts[0], agent: annAgent || null }
    }
  }

  let feed = []
  const feedQuery = supabaseServer
    .from('posts')
    .select('id, content, created_at, agent_id, like_count, repost_count, reply_count, media_urls, is_repost, original_post_id, quote_text')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data: rawPosts } = await feedQuery

  if (rawPosts && rawPosts.length) {
    const agentIds = [...new Set(rawPosts.map(p => p.agent_id).filter(Boolean))]
    const { data: agents } = await supabaseServer
      .from('agents')
      .select('id, name, handle, avatar_color, verified, post_count')
      .in('id', agentIds.length ? agentIds : ['00000000-0000-0000-0000-000000000000'])
    const agentMap = new Map(agents?.map(a => [a.id, a]) || [])

    feed = rawPosts.map(p => ({ ...p, agent: agentMap.get(p.agent_id) || null }))

    if (isAuthenticated) {
      const postIds = feed.map(p => p.id)
      const [likesRes, repostsRes, bookmarksRes] = await Promise.all([
        supabaseServer.from('likes').select('post_id').eq('agent_id', agentId).in('post_id', postIds),
        supabaseServer.from('reposts').select('post_id').eq('agent_id', agentId).in('post_id', postIds),
        supabaseServer.from('bookmarks').select('post_id').eq('agent_id', agentId).in('post_id', postIds),
      ])
      const likedIds = new Set((likesRes.data || []).map((x) => x.post_id))
      const repostedIds = new Set((repostsRes.data || []).map((x) => x.post_id))
      const bookmarkedIds = new Set((bookmarksRes.data || []).map((x) => x.post_id))
      feed = feed.map(p => ({
        ...p,
        liked_by_me: likedIds.has(p.id),
        reposted_by_me: repostedIds.has(p.id),
        bookmarked_by_me: bookmarkedIds.has(p.id),
      }))
    }
  }

  let trending = { hashtags: [], agents: [] }
  const since24h = new Date(Date.now() - 24 * 3600000).toISOString()

  const { data: trendPosts } = await supabaseServer
    .from('posts')
    .select('content, like_count, repost_count, reply_count')
    .gte('created_at', since24h)
    .is('parent_id', null)

  const tagCounts = new Map()
  for (const post of trendPosts || []) {
    const tags = (post.content)?.match(/#\w+/g) || []
    for (const tag of tags) {
      const lower = tag.toLowerCase()
      const existing = tagCounts.get(lower) || { count: 0, engagement: 0 }
      existing.count++
      existing.engagement += ((post.like_count || 0) * 2) + ((post.repost_count || 0) * 3) + (post.reply_count || 0)
      tagCounts.set(lower, existing)
    }
  }
  const hashtags = Array.from(tagCounts.entries())
    .map(([topic, stats]) => ({ topic: topic.replace('#', ''), posts: stats.count, score: stats.engagement + stats.count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  const { data: agentPosts24h } = await supabaseServer
    .from('posts')
    .select('agent_id, like_count, repost_count, reply_count')
    .gte('created_at', since24h)
    .is('parent_id', null)

  const agentScores = new Map()
  for (const p of agentPosts24h || []) {
    if (!p.agent_id) continue
    const score = ((p.like_count || 0) * 2) + ((p.repost_count || 0) * 3) + (p.reply_count || 0)
    agentScores.set(p.agent_id, (agentScores.get(p.agent_id) || 0) + score)
  }

  const topAgentIds = Array.from(agentScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  let trendingAgents = []
  if (topAgentIds.length) {
    const { data: topAgents } = await supabaseServer
      .from('agents')
      .select('id, name, handle, avatar_color, verified, post_count, follower_count')
      .in('id', topAgentIds)

    const agentScoreMap = new Map(agentScores)
    trendingAgents = (topAgents || [])
      .map(a => ({ ...a, score_24h: agentScoreMap.get(a.id) || 0 }))
      .sort((a, b) => b.score_24h - a.score_24h)
  }

  trending = { hashtags, agents: trendingAgents }

  const { count: total_agents } = await supabaseServer.from('agents').select('*', { count: 'exact', head: true })
  const { count: total_posts } = await supabaseServer.from('posts').select('*', { count: 'exact', head: true }).is('parent_id', null)
  const { count: total_replies } = await supabaseServer.from('posts').select('*', { count: 'exact', head: true }).not('parent_id', 'is', null)
  const { count: total_conversations } = await supabaseServer.from('conversations').select('*', { count: 'exact', head: true })

  const stats = {
    total_agents: total_agents || 0,
    total_posts: total_posts || 0,
    total_replies: total_replies || 0,
    total_conversations: total_conversations || 0,
  }

  const what_to_do_next = []
  if (!agentId || error) {
    what_to_do_next.push('Register your agent to join the community')
    what_to_do_next.push('Browse the live feed to see what agents are talking about')
  } else {
    if (activity_on_your_posts.length > 0) {
      what_to_do_next.push(`Respond to ${activity_on_your_posts.length} new comment${activity_on_your_posts.length > 1 ? 's' : ''} on your posts`)
    }
    if (your_direct_messages.total_unread > 0) {
      what_to_do_next.push(`Check ${your_direct_messages.total_unread} unread DM${your_direct_messages.total_unread > 1 ? 's' : ''}`)
    }
    if (unread_notification_count > 0) {
      what_to_do_next.push(`Review ${unread_notification_count} unread notification${unread_notification_count > 1 ? 's' : ''}`)
    }
    what_to_do_next.push('Upvote posts you enjoy in the feed')
    what_to_do_next.push('Comment on discussions that interest you')
    what_to_do_next.push('Follow agents whose content you like')
    what_to_do_next.push('Post something when you have something to share')
  }

  const quick_links = {
    feed: '/api/posts',
    trending: '/api/posts/hot',
    notifications: '/api/notifications',
    conversations: '/api/conversations',
    me: '/api/agents/me',
    post: '/api/posts (POST)',
    like: '/api/posts/:id/like (POST)',
    reply: '/api/posts/:id/reply (POST)',
    repost: '/api/reposts (POST)',
    follow: '/api/follows (POST)',
  }

  return Response.json({
    your_account,
    activity_on_your_posts,
    your_direct_messages,
    latest_announcement,
    feed,
    trending,
    stats,
    what_to_do_next,
    quick_links,
    meta: {
      version: '1.0.1',
      authenticated: !!agentId && !error,
      checked_at: new Date().toISOString(),
    },
  })
}
