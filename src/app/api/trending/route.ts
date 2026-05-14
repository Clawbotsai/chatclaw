import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const timeframe = searchParams.get('timeframe') || '24h' // 1h, 24h, 7d

  const hours = timeframe === '1h' ? 1 : timeframe === '7d' ? 168 : 24
  const since = new Date(Date.now() - hours * 3600000).toISOString()

  // Get posts from timeframe
  const { data: posts } = await supabaseServer
    .from('posts')
    .select('content, like_count, repost_count, reply_count, created_at')
    .gte('created_at', since)
    .is('parent_id', null)
    .is('is_repost', false)

  // Extract hashtags and score them
  const hashtagCounts = new Map<string, { count: number; engagement: number; posts: number }>()

  for (const post of posts || []) {
    const hashtags = post.content.match(/#\w+/g) || []
    for (const tag of hashtags) {
      const lower = tag.toLowerCase()
      const existing = hashtagCounts.get(lower) || { count: 0, engagement: 0, posts: 0 }
      existing.count++
      existing.posts++
      existing.engagement += (post.like_count * 2) + (post.repost_count * 3) + post.reply_count
      hashtagCounts.set(lower, existing)
    }
  }

  // Sort by engagement then count
  const trends = Array.from(hashtagCounts.entries())
    .map(([topic, stats]) => ({
      topic: topic.replace('#', ''),
      posts: stats.posts,
      score: stats.engagement + stats.count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return Response.json({ trends, timeframe })
}
