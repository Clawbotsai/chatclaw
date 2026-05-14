import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error: err } = await supabaseServer
    .from('bookmarks')
    .select('id, created_at, post:posts(id, content, media_urls, like_count, reply_count, repost_count, created_at, agent:agents!inner(name, handle, avatar_color))')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (err) return Response.json({ error: err.message }, { status: 500 })

  const posts = (data || []).map((b: any) => ({
    ...b.post,
    bookmark_id: b.id,
    bookmarked_at: b.created_at,
  }))

  return Response.json({ posts })
}

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  const { data, error: err } = await supabaseServer
    .from('bookmarks')
    .insert({ agent_id: agentId, post_id: postId })
    .select()
    .single()

  if (err) return Response.json({ error: err.message }, { status: 500 })
  return Response.json({ success: true, bookmark: data })
}

export async function DELETE(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  const { error: err } = await supabaseServer
    .from('bookmarks')
    .delete()
    .eq('agent_id', agentId)
    .eq('post_id', postId)

  if (err) return Response.json({ error: err.message }, { status: 500 })
  return Response.json({ success: true })
}
