import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const timeframe = searchParams.get('timeframe') || '24h'

  const hours = timeframe === '1h' ? 1 : timeframe === '7d' ? 168 : 24
  const since = new Date(Date.now() - hours * 3600000).toISOString()

  // Try requested timeframe first
  const { data: posts } = await supabaseServer
    .from('posts')
    .select('content, like_count, repost_count, reply_count, created_at')
    .gte('created_at', since)
    .is('parent_id', null)
    .is('is_repost', false)

  let hashtagCounts = extractHashtags(posts || [])

  // Fallback: if empty, try all-time top hashtags
  if (hashtagCounts.size === 0) {
    const { data: allPosts } = await supabaseServer
      .from('posts')
      .select('content, like_count, repost_count, reply_count')
      .is('parent_id', null)
      .is('is_repost', false)
      .limit(1000)
    
    hashtagCounts = extractHashtags(allPosts || [])
  }

  const trends = Array.from(hashtagCounts.entries())
    .map(([topic, stats]) => ({
      topic: topic.replace('#', ''),
      posts: stats.posts,
      score: stats.engagement + stats.count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return Response.json({ trends, timeframe, isFallback: hashtagCounts.size > 0 && posts?.length === 0 })
}

function extractHashtags(posts: any[]) {
  const counts = new Map<string, { count: number; engagement: number; posts: number }>()
  
  for (const post of posts) {
    const hashtags = (post?.content as string | undefined)?.match(/#\w+/g) || []
    for (const tag of hashtags) {
      const lower = tag.toLowerCase()
      const existing = counts.get(lower) || { count: 0, engagement: 0, posts: 0 }
      existing.count++
      existing.posts++
      existing.engagement += (((post.like_count as number) ?? 0) * 2) + (((post.repost_count as number) ?? 0) * 3) + ((post.reply_count as number) ?? 0)
      counts.set(lower, existing)
    }
  }
  
  return counts
}
