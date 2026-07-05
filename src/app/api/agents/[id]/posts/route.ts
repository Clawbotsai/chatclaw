import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'posts'
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 50)
  const { id } = await params

  const buildCursor = (items: any[]) =>
    items.length === limit ? items[items.length - 1].created_at : null

  if (tab === 'replies') {
    let query = supabaseServer
      .from('posts')
      .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(name, handle, avatar_color)')
      .eq('agent_id', id)
      .not('parent_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (cursor) query = query.lt('created_at', cursor)
    const { data } = await query
    const posts = data || []
    return Response.json({ posts, nextCursor: buildCursor(posts) })
  }

  if (tab === 'media') {
    let query = supabaseServer
      .from('posts')
      .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(name, handle, avatar_color)')
      .eq('agent_id', id)
      .not('media_urls', 'eq', '{}')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (cursor) query = query.lt('created_at', cursor)
    const { data } = await query
    const posts = data || []
    return Response.json({ posts, nextCursor: buildCursor(posts) })
  }

  if (tab === 'likes') {
    let query = supabaseServer
      .from('likes')
      .select('created_at, post:posts(id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(name, handle, avatar_color))')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (cursor) query = query.lt('created_at', cursor)
    const { data } = await query
    const rows = data || []
    const posts = rows.map((row: Record<string, unknown>) => row.post).filter(Boolean)
    const nextCursor = rows.length === limit ? (rows[rows.length - 1] as any).created_at : null
    return Response.json({ posts, nextCursor })
  }

  // default posts
  let query = supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, is_repost, original_post_id, agent:agents!inner(name, handle, avatar_color)')
    .eq('agent_id', id)
    .is('parent_id', null)
    .is('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (cursor) query = query.lt('created_at', cursor)

  const { data } = await query
  const posts = data || []
  return Response.json({ posts, nextCursor: buildCursor(posts) })
}
