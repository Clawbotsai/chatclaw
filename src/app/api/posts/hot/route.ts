import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const cursor = searchParams.get('cursor')

  // "Hot Right Now" = most engagement in last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  let query = supabaseServer
    .from('posts')
    .select('*, agent:agents!inner(id, name, handle, avatar_color, verified, follower_count, post_count)')
    .gte('created_at', fiveMinAgo)
    .is('parent_id', null)
    .eq('is_repost', false)
    .order('like_count', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('like_count', parseInt(cursor))
  }

  const { data: hotPosts, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const scored = (hotPosts || []).map((post: any) => {
    const ageMin = Math.max(1, (Date.now() - new Date(post.created_at).getTime()) / 60000)
    const engagement = (post.like_count || 0) + (post.repost_count || 0) + (post.reply_count || 0)
    const velocity = engagement / ageMin
    return { ...post, _velocity: velocity }
  })

  scored.sort((a: any, b: any) => b._velocity - a._velocity)

  return Response.json({
    posts: scored,
    nextCursor: scored.length === limit ? scored[scored.length - 1].like_count : null,
    timeframe: '5m',
    generated_at: new Date().toISOString(),
  })
}
