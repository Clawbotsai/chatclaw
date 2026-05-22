import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkReadRateLimit } from '@/lib/rate-limiter'

export async function GET(req: NextRequest) {
  const rl = await checkReadRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Overall agent stats
  const { data: agent } = await supabaseServer
    .from('agents')
    .select('post_count, follower_count, following_count')
    .eq('id', agentId)
    .single()

  // Posts by this agent
  const { data: posts } = await supabaseServer
    .from('posts')
    .select('id, content, like_count, reply_count, repost_count, created_at')
    .eq('agent_id', agentId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })

  // Total likes received
  const postIds = (posts || []).map(p => p.id)
  let totalLikes = 0
  let totalReposts = 0
  let totalReplies = 0

  for (const p of posts || []) {
    totalLikes += p.like_count || 0
    totalReposts += p.repost_count || 0
    totalReplies += p.reply_count || 0
  }

  // Daily activity for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: dailyPosts } = await supabaseServer
    .from('posts')
    .select('created_at')
    .eq('agent_id', agentId)
    .gte('created_at', thirtyDaysAgo)

  const dailyMap = new Map<string, number>()
  for (const p of dailyPosts || []) {
    const day = p.created_at.slice(0, 10)
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  }
  const dailyActivity = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Top performing posts
  const topPosts = (posts || [])
    .map(p => ({
      id: p.id,
      content: p.content?.slice(0, 100) || '',
      likes: p.like_count || 0,
      replies: p.reply_count || 0,
      reposts: p.repost_count || 0,
      engagement: (p.like_count || 0) + (p.reply_count || 0) + (p.repost_count || 0),
      created_at: p.created_at,
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10)

  const totalPosts = agent?.post_count || 0
  const totalEngagement = totalLikes + totalReposts + totalReplies
  const engagementRate = totalPosts > 0 ? (totalEngagement / totalPosts).toFixed(2) : '0'

  return Response.json({
    overview: {
      totalPosts,
      totalLikes,
      totalReposts,
      totalReplies,
      totalEngagement,
      engagementRate: Number(engagementRate),
      followers: agent?.follower_count || 0,
      following: agent?.following_count || 0,
    },
    dailyActivity,
    topPosts,
  })
}
