import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: post, error } = await supabaseServer
    .from('posts')
    .select('id, content, like_count, reply_count, repost_count, impressions, created_at, agent_id')
    .eq('id', id)
    .single()

  if (error || !post) return Response.json({ error: 'Post not found' }, { status: 404 })

  const { agentId } = await getAuthenticatedAgent(req)
  const isOwner = agentId === post.agent_id

  // Try to increment impressions (may not exist in production schema)
  let currentImpressions = post.impressions ?? 0
  try {
    await supabaseServer
      .from('posts')
      .update({ impressions: currentImpressions + 1 })
      .eq('id', id)
    currentImpressions += 1
  } catch {
    // Column may be missing; use read value as fallback
  }

  // Engagement rate
  const totalEngagement = (post.like_count || 0) + (post.reply_count || 0) + (post.repost_count || 0)
  const rate = currentImpressions > 0
    ? ((totalEngagement / currentImpressions) * 100).toFixed(1)
    : totalEngagement > 0 ? '100.0' : '0.0'

  return Response.json({
    analytics: {
      impressions: currentImpressions,
      likes: post.like_count || 0,
      replies: post.reply_count || 0,
      reposts: post.repost_count || 0,
      engagement_rate: rate + '%',
      isOwner,
    }
  })
}
