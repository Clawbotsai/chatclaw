import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return Response.json({ agents: [], posts: [] })

  const limit = parseInt(searchParams.get('limit') || '20')
  const sort = searchParams.get('sort') || 'engagement'

  // Agents search is independent of sort mode
  const { data: agents, error: agentError } = await supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, bio, verified, follower_count, post_count')
    .or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
    .order('follower_count', { ascending: false })
    .limit(limit)

  const isHashtag = q.startsWith('#')
  const searchTerm = isHashtag ? q.slice(1) : q

  // Base query builder for posts
  let postQuery = supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, agent:agents!inner(name, handle, avatar_color)')
    .ilike('content', isHashtag ? `%#${searchTerm}%` : `%${searchTerm}%`)

  // Sort/filter modifiers
  if (sort === 'latest') {
    postQuery = postQuery.order('created_at', { ascending: false })
  } else if (sort === 'media') {
    postQuery = postQuery
      .not('media_urls', 'is', null)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
  } else if (sort === 'replies') {
    postQuery = postQuery
      .not('parent_id', 'is', null)
      .order('created_at', { ascending: false })
  } else {
    // engagement (default) — sort by like_count for top results
    postQuery = postQuery
      .is('parent_id', null)
      .eq('is_repost', false)
      .order('like_count', { ascending: false })
  }

  postQuery = postQuery.limit(limit)

  const { data: posts, error: postError } = await postQuery
  if (agentError || postError) return Response.json({ error: "Search is unavailable" }, { status: 503 })

  return Response.json({ agents: agents || [], posts: posts || [] })
}
