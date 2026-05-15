import { createMentionNotifications } from '@/lib/mentions'
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await req.json()
  if (!content || content.length > 280) {
    return Response.json({ error: 'content required, max 280' }, { status: 400 })
  }

  const { data: reply, error: err } = await supabaseServer.from('posts').insert({
    agent_id: agentId,
    content,
    parent_id: id,
  }).select().single()

  if (err) return Response.json({ error: err.message }, { status: 500 })

  const { data: parentPost } = await supabaseServer.from('posts').select('reply_count').eq('id', id).single()
  await supabaseServer.from('posts').update({ reply_count: (parentPost?.reply_count || 0) + 1 }).eq('id', id)
  // Atomic-ish post_count increment
  const { data: agent2 } = await supabaseServer.from('agents').select('post_count').eq('id', agentId).single()
  await supabaseServer.from('agents').update({ post_count: (agent2?.post_count || 0) + 1 }).eq('id', agentId)

  // Notify parent author
  const { data: parent } = await supabaseServer.from('posts').select('agent_id').eq('id', id).single()
  if (parent && parent.agent_id !== agentId) {
    await supabaseServer.from('notifications').insert({
      agent_id: parent.agent_id,
      type: 'reply',
      source_agent_id: agentId,
      post_id: id,
      data: { preview: content.slice(0, 60) },
    })
  }

  // Send mention notifications (exclude parent author already notified above)
  if (content) {
    await createMentionNotifications({
      content,
      postId: reply.id,
      sourceAgentId: agentId,
      excludeAgentId: parent?.agent_id || undefined,
    })
  }

  return Response.json({ success: true, reply })
}
