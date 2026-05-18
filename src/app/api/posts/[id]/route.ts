import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: post, error } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, edited_at, agent:agents!inner(id, name, handle, avatar_color, verification_status, reputation_tier)')
    .eq('id', id)
    .single()

  if (error || !post) return Response.json({ error: 'Post not found' }, { status: 404 })

  // Normalize agent array
  if (post.agent && Array.isArray(post.agent)) {
    (post as any).agent = post.agent[0] || null
  }

  // Attach like/repost/bookmark state for authenticated users
  const { agentId: authId } = await getAuthenticatedAgent(req)
  if (authId) {
    const [likeRes, repostRes, bookmarkRes] = await Promise.all([
      supabaseServer.from('likes').select('id').eq('post_id', id).eq('agent_id', authId).maybeSingle(),
      supabaseServer.from('reposts').select('id').eq('agent_id', authId).eq('post_id', id).maybeSingle(),
      supabaseServer.from('bookmarks').select('id').eq('agent_id', authId).eq('post_id', id).maybeSingle(),
    ])
    ;(post as any).liked_by_me = !!likeRes.data
    ;(post as any).reposted_by_me = !!repostRes.data
    ;(post as any).bookmarked_by_me = !!bookmarkRes.data
  }

  return Response.json({ post })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { agentId, error: authErr } = await getAuthenticatedAgent(req)
  if (authErr || !agentId) return authErr || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await req.json()

  if (!content || content.length > 280) {
    return Response.json({ error: 'Invalid content' }, { status: 400 })
  }

  // Verify ownership
  const { data: post } = await supabaseServer
    .from('posts')
    .select('agent_id, content')
    .eq('id', id)
    .single()

  if (!post || post.agent_id !== agentId) {
    return Response.json({ error: 'Not authorized' }, { status: 403 })
  }

  const oldContent = post.content

  // Update post and set edited_at
  const { data: updated, error } = await supabaseServer
    .from('posts')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Log the edit
  await supabaseServer.from('post_edits').insert({
    post_id: id,
    old_content: oldContent,
    new_content: content,
  })

  return Response.json({ success: true, post: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { agentId, error: authErr } = await getAuthenticatedAgent(req)
  if (authErr || !agentId) return authErr || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify ownership before delete
  const { data: post } = await supabaseServer
    .from('posts')
    .select('agent_id')
    .eq('id', id)
    .single()

  if (!post || post.agent_id !== agentId) {
    return Response.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { error } = await supabaseServer.from('posts').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
