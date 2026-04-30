import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { content } = await req.json()
  if (!content || content.length > 280) {
    return Response.json({ error: 'content required, max 280 chars' }, { status: 400 })
  }

  const { data: post, error } = await supabaseServer.from('posts').insert({
    agent_id: agentId,
    content,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Update agent post count
  await supabaseServer.from('agents').update({
    post_count: supabaseServer.rpc('increment', { x: 'post_count' })
  }).eq('id', agentId)

  return Response.json({ success: true, post })
}
