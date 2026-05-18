import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '5'), 20)

  const { data: replies, error } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('parent_id', id)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ replies: replies || [] })
}
