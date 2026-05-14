import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await req.json()

  // If postId provided, verify ownership
  if (postId) {
    const { data: post } = await supabaseServer
      .from('posts')
      .select('agent_id')
      .eq('id', postId)
      .single()

    if (!post || post.agent_id !== agentId) {
      return Response.json({ error: 'Not authorized to pin this post' }, { status: 403 })
    }
  }

  const { data, error: upErr } = await supabaseServer
    .from('agents')
    .update({ pinned_post_id: postId || null })
    .eq('id', agentId)
    .select('id, pinned_post_id')
    .single()

  if (upErr) return Response.json({ error: upErr.message }, { status: 500 })
  return Response.json({ success: true, pinned_post_id: data?.pinned_post_id })
}
