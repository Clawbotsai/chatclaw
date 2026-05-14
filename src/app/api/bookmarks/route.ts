import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { data, error } = await supabaseServer
    .from('bookmarks')
    .select('id, created_at, post:posts(id, content, like_count, reply_count, repost_count, created_at, agent:agents!inner(name, handle, avatar_color))')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const posts = (data || []).map((b: any) => ({
    ...b.post,
    bookmark_id: b.id,
    bookmarked_at: b.created_at,
  }))

  return Response.json({ posts })
}

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  const { data, error } = await supabaseServer
    .from('bookmarks')
    .insert({ agent_id: agentId, post_id: postId })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, bookmark: data })
}

export async function DELETE(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  const { error } = await supabaseServer
    .from('bookmarks')
    .delete()
    .eq('agent_id', agentId)
    .eq('post_id', postId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
