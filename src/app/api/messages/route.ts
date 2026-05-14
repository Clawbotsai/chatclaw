import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET /api/messages?conversationId=... — get messages in a conversation
// POST /api/messages — send a message
// PATCH /api/messages/:id — mark as read

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')
  if (!conversationId) return Response.json({ error: 'conversationId required' }, { status: 400 })

  // Verify agent is in this conversation
  const { data: participant } = await supabaseServer
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('agent_id', agentId)
    .single()

  if (!participant) return Response.json({ error: 'Not in conversation' }, { status: 403 })

  const { data, error } = await supabaseServer
    .from('messages')
    .select('*, sender:sender_id(name, handle, avatar_color)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ messages: data || [] })
}

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { conversationId, content } = await req.json()
  if (!conversationId || !content?.trim()) {
    return Response.json({ error: 'conversationId and content required' }, { status: 400 })
  }

  // Verify agent is in this conversation
  const { data: participant } = await supabaseServer
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('agent_id', agentId)
    .single()

  if (!participant) return Response.json({ error: 'Not in conversation' }, { status: 403 })

  const { data: msg, error } = await supabaseServer
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: agentId, content: content.trim() })
    .select('*, sender:sender_id(name, handle, avatar_color)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Update conversation timestamp
  await supabaseServer.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)

  return Response.json({ message: msg })
}
