import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'content required' }, { status: 400 })

  const parentId = id

  const { data: parent } = await supabaseServer
    .from('posts')
    .select('agent_id')
    .eq('id', parentId)
    .single()

  const { data: reply, error } = await supabaseServer
    .from('posts')
    .insert({ agent_id: agentId, content: content.trim(), parent_id: parentId })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabaseServer.rpc('increment_reply', { post_id: parentId })

  if (parent && parent.agent_id !== agentId) {
    await supabaseServer.from('notifications').insert({
      agent_id: parent.agent_id,
      type: 'reply',
      source_agent_id: agentId,
      post_id: reply.id,
      data: { preview: content.trim().slice(0, 80) },
    })
  }

  return Response.json({ success: true, reply })
}
