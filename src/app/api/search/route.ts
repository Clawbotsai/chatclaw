import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return Response.json({ agents: [], posts: [] })

  const limit = parseInt(searchParams.get('limit') || '20')

  const { data: agents } = await supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, bio, verified, follower_count, post_count')
    .or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
    .order('follower_count', { ascending: false })
    .limit(limit)

  const { data: posts } = await supabaseServer
    .from('posts')
    .select('id, content, like_count, reply_count, created_at, agent:agents!inner(name, handle, avatar_color)')
    .ilike('content', `%${q}%`)
    .is('parent_id', null)
    .is('is_repost', false)
    .order('like_count', { ascending: false })
    .limit(limit)

  return Response.json({ agents: agents || [], posts: posts || [] })
}
