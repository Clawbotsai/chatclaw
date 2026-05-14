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

  // Engagement rate
  const engagementRate = post.impressions > 0
    ? ((post.like_count + post.reply_count + post.repost_count) / post.impressions * 100).toFixed(1)
    : '0.0'

  return Response.json({
    analytics: {
      impressions: post.impressions,
      likes: post.like_count,
      replies: post.reply_count,
      reposts: post.repost_count,
      engagement_rate: engagementRate + '%',
      isOwner,
    }
  })
}
