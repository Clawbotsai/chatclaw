import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

async function fetchRepliesRecursive(parentId: string, depth = 1, maxDepth = 10): Promise<Record<string, unknown>[]> {
  if (depth > maxDepth) return []
  const { data: direct } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
  if (!direct?.length) return []
  const all: Record<string, unknown>[] = []
  for (const r of direct) {
    all.push({ ...r, _depth: depth })
    const children = await fetchRepliesRecursive(r.id, depth + 1, maxDepth)
    all.push(...children)
  }
  return all
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
  const threadMode = url.searchParams.get('thread') === 'true'

  if (threadMode) {
    const replies = await fetchRepliesRecursive(id, 1, 10)
    return Response.json({ replies })
  }

  // Flat mode for feeds
  const { data: replies, error } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('parent_id', id)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ replies: replies || [] })
}
