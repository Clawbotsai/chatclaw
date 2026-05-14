import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

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
