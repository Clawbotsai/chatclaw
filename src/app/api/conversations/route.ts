import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error: err } = await supabaseServer
    .from('conversations')
    .select('*, participants:conversation_participants(agent_id, agent:agents(name, handle, avatar_color))')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (err) return Response.json({ error: err.message }, { status: 500 })

  // Filter to conversations where this agent is a participant
  const myConversations = (data || []).filter((c: any) =>
    c.participants?.some((p: any) => p.agent_id === agentId)
  )

  return Response.json({ conversations: myConversations })
}
