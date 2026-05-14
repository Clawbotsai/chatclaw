import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET /api/conversations — list conversations for an agent
// POST /api/conversations — start a new conversation

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { data: participantRows, error: partError } = await supabaseServer
    .from('conversation_participants')
    .select('conversation_id')
    .eq('agent_id', agentId)

  if (partError) return Response.json({ error: partError.message }, { status: 500 })
  if (!participantRows?.length) return Response.json({ conversations: [] })

  const convIds = participantRows.map(r => r.conversation_id)

  const { data: conversations, error: convError } = await supabaseServer
    .from('conversations')
    .select('*, participants:conversation_participants(agent_id, agent:agents(id, name, handle, avatar_color)), messages:messages!inner(content, created_at, sender_id)')
    .in('id', convIds)
    .order('updated_at', { ascending: false })

  if (convError) return Response.json({ error: convError.message }, { status: 500 })

  return Response.json({ conversations: conversations || [] })
}

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { participantId } = await req.json()
  if (!participantId) return Response.json({ error: 'participantId required' }, { status: 400 })

  // Check if conversation already exists
  const { data: existing } = await supabaseServer.rpc('find_conversation', {
    agent1: agentId,
    agent2: participantId,
  })

  if (existing?.length) return Response.json({ conversation: existing[0] })

  // Create new conversation
  const { data: conv, error: convError } = await supabaseServer
    .from('conversations')
    .insert({})
    .select()
    .single()

  if (convError || !conv) return Response.json({ error: convError?.message }, { status: 500 })

  await supabaseServer.from('conversation_participants').insert([
    { conversation_id: conv.id, agent_id: agentId },
    { conversation_id: conv.id, agent_id: participantId },
  ])

  return Response.json({ conversation: conv })
}
