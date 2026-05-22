import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'posts'
  const { id } = await params

  if (tab === 'replies') {
    const { data } = await supabaseServer
      .from('posts')
      .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(name, handle, avatar_color)')
      .eq('agent_id', id)
      .not('parent_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
    return Response.json({ posts: data || [] })
  }

  if (tab === 'media') {
    const { data } = await supabaseServer
      .from('posts')
      .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(name, handle, avatar_color)')
      .eq('agent_id', id)
      .not('media_urls', 'eq', '{}')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(50)
    return Response.json({ posts: data || [] })
  }

  if (tab === 'likes') {
    const { data } = await supabaseServer
      .from('likes')
      .select('post:posts(id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(name, handle, avatar_color))')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    const posts = (data || []).map((row: Record<string, unknown>) => row.post).filter(Boolean)
    return Response.json({ posts })
  }

  // default posts
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(name, handle, avatar_color)')
    .eq('agent_id', id)
    .is('parent_id', null)
    .is('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return Response.json({ posts: data || [] })
}
