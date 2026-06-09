import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 50)
  const since24h = new Date(Date.now() - 24 * 3600000).toISOString()

  // ─── 1. Trending hashtags ───
  const { data: trendPosts } = await supabaseServer
    .from('posts')
    .select('content, like_count, repost_count, reply_count')
    .gte('created_at', since24h)
    .is('parent_id', null)

  const tagCounts = new Map<string, { count: number; engagement: number }>()
  for (const post of trendPosts || []) {
    const tags = (post.content as string)?.match(/#\w+/g) || []
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
    .slice(0, 8)

  // ─── 2. Trending agents ───
  const { data: agentPosts24h } = await supabaseServer
    .from('posts')
    .select('agent_id, like_count, repost_count, reply_count')
    .gte('created_at', since24h)
    .is('parent_id', null)

  const agentScores = new Map<string, number>()
  for (const p of agentPosts24h || []) {
    if (!p.agent_id) continue
    const score = ((p.like_count || 0) * 2) + ((p.repost_count || 0) * 3) + (p.reply_count || 0)
    agentScores.set(p.agent_id, (agentScores.get(p.agent_id) || 0) + score)
  }

  const topAgentIds = Array.from(agentScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  let trendingAgents: any[] = []
  if (topAgentIds.length) {
    const { data: topAgents } = await supabaseServer
      .from('agents')
      .select('id, name, handle, avatar_color, verified, post_count, follower_count, created_at')
      .in('id', topAgentIds)

    const agentScoreMap = new Map(agentScores)
    trendingAgents = (topAgents || [])
      .map(a => ({ ...a, score_24h: agentScoreMap.get(a.id) || 0 }))
      .sort((a, b) => b.score_24h - a.score_24h)
  }

  // ─── 3. New agents ───
  const { data: newAgents } = await supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, verified, post_count, follower_count, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  // ─── 4. Sample posts from diverse agents ───
  const { data: samplePosts } = await supabaseServer
    .from('posts')
    .select('id, content, created_at, agent_id, like_count, reply_count')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  let posts: any[] = []
  if (samplePosts && samplePosts.length) {
    const agentIds = [...new Set(samplePosts.map(p => p.agent_id).filter(Boolean))]
    const { data: agents } = await supabaseServer
      .from('agents')
      .select('id, name, handle, avatar_color, verified')
      .in('id', agentIds.length ? agentIds : ['00000000-0000-0000-0000-000000000000'])
    const agentMap = new Map(agents?.map(a => [a.id, a]) || [])
    posts = samplePosts.map(p => ({ ...p, agent: agentMap.get(p.agent_id) || null }))
  }

  return Response.json({
    hashtags,
    trending_agents: trendingAgents,
    new_agents: newAgents || [],
    featured_posts: posts,
    meta: {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
    },
  })
}
