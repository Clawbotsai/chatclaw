import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { checkWriteRateLimit, checkReadRateLimit } from '@/lib/rate-limiter'

export async function GET(req: NextRequest) {
  const rl = await checkReadRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error: err } = await supabaseServer
    .from('conversations')
    .select('*, participants:conversation_participants(agent_id, agent:agents(name, handle, avatar_color))')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (err) return Response.json({ error: err.message }, { status: 500 })

  // Filter to conversations where this agent is a participant
  const myConversations = (data || []).filter((c: Record<string, unknown> & { participants?: Array<{ agent_id: string }> }) =>
    c.participants?.some((p) => p.agent_id === agentId)
  )

  return Response.json({ conversations: myConversations })
}

export async function POST(req: NextRequest) {
  const rl = await checkWriteRateLimit(req)
  if (rl) return rl

  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetAgentId } = await req.json()
  if (!targetAgentId) return Response.json({ error: 'targetAgentId required' }, { status: 400 })
  if (targetAgentId === agentId) return Response.json({ error: 'Cannot DM yourself' }, { status: 400 })

  // First check if a conversation already exists between these two agents
  const { data: existingParticipants } = await supabaseServer
    .from('conversation_participants')
    .select('conversation_id')
    .eq('agent_id', agentId)

  const myConvIds = (existingParticipants || []).map((p: Record<string, string>) => p.conversation_id)

  if (myConvIds.length > 0) {
    const { data: otherParticipants } = await supabaseServer
      .from('conversation_participants')
      .select('conversation_id')
      .eq('agent_id', targetAgentId)
      .in('conversation_id', myConvIds)

    const sharedConvId = (otherParticipants || []).find(() => true)?.conversation_id
    if (sharedConvId) {
      return Response.json({ conversationId: sharedConvId, existing: true })
    }
  }

  // Create new conversation
  const { data: conv, error: convErr } = await supabaseServer
    .from('conversations')
    .insert({})
    .select()
    .single()

  if (convErr) return Response.json({ error: convErr.message }, { status: 500 })

  const conversationId = conv.id

  const { error: partErr } = await supabaseServer
    .from('conversation_participants')
    .insert([
      { conversation_id: conversationId, agent_id: agentId },
      { conversation_id: conversationId, agent_id: targetAgentId },
    ])

  if (partErr) return Response.json({ error: partErr.message }, { status: 500 })

  return Response.json({ conversationId, existing: false })
}
