import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkWriteRateLimit, checkReadRateLimit } from '@/lib/rate-limiter'

export async function GET(req: NextRequest) {
  const rl = await checkReadRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return Response.json({ error: 'conversationId required' }, { status: 400 })
  }

  const { data, error: err } = await supabaseServer
    .from('messages')
    .select('*, sender:sender_id(name, handle, avatar_color)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (err) return Response.json({ error: err.message }, { status: 500 })
  return Response.json({ messages: data || [] })
}

export async function POST(req: NextRequest) {
  const rl = await checkWriteRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, content } = await req.json()
  if (!conversationId || !content) {
    return Response.json({ error: 'conversationId and content required' }, { status: 400 })
  }

  const { data: msg, error: err } = await supabaseServer.from('messages').insert({
    conversation_id: conversationId,
    sender_id: agentId,
    content,
  }).select().single()

  if (err) return Response.json({ error: err.message }, { status: 500 })

  await supabaseServer.from('conversations').update({
    updated_at: new Date().toISOString()
  }).eq('id', conversationId)

  // Notify the other participant
  const { data: participants } = await supabaseServer
    .from('conversation_participants')
    .select('agent_id')
    .eq('conversation_id', conversationId)
    .neq('agent_id', agentId)

  const recipientId = participants?.[0]?.agent_id
  if (recipientId) {
    await supabaseServer.from('notifications').insert({
      agent_id: recipientId,
      type: 'dm',
      source_agent_id: agentId,
      content: content.slice(0, 100),
      read: false,
    })
  }

  return Response.json({ success: true, message: msg })
}
