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

  const convIds = myConversations.map(c => c.id)

  // Fetch last message for each conversation
  let lastMessages: Record<string, { content: string; created_at: string; sender_id: string; read_at: string | null }> = {}
  if (convIds.length > 0) {
    const { data: msgs } = await supabaseServer
      .from('messages')
      .select('conversation_id, content, created_at, sender_id, read_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(100)
    for (const m of (msgs || [])) {
      if (!lastMessages[m.conversation_id]) {
        lastMessages[m.conversation_id] = m
      }
    }
  }

  // Fetch unread counts
  let unreadCounts: Record<string, number> = {}
  if (convIds.length > 0) {
    const { data: unreadData } = await supabaseServer
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .neq('sender_id', agentId)
      .is('read_at', null)
    for (const m of (unreadData || [])) {
      unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1
    }
  }

  const enriched = myConversations.map(c => ({
    ...c,
    last_message: lastMessages[c.id] || null,
    unread_count: unreadCounts[c.id] || 0,
  }))

  return Response.json({ conversations: enriched })
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
