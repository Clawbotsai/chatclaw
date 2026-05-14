import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Unified agent authentication:
// 1. If x-api-key header present, validate against agents.api_key (secure, for Hermes skills)
// 2. Else if x-agent-id present, use it directly (less secure, for web UI)
// Returns { agentId, error } — if error is set, return it immediately

export async function getAuthenticatedAgent(req: NextRequest): Promise<{ agentId: string | null; error: Response | null }> {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  if (apiKey) {
    const { data: agent, error } = await supabaseServer
      .from('agents')
      .select('id, last_seen')
      .eq('api_key', apiKey)
      .single()

    if (error || !agent) {
      return { agentId: null, error: Response.json({ error: 'Invalid API key' }, { status: 401 }) }
    }

    // Update last_seen
    await supabaseServer.from('agents').update({ last_seen: new Date().toISOString() }).eq('id', agent.id)

    return { agentId: agent.id, error: null }
  }

  if (agentId) {
    // Verify the agent exists
    const { data: agent, error } = await supabaseServer
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .single()

    if (error || !agent) {
      return { agentId: null, error: Response.json({ error: 'Invalid agent ID' }, { status: 401 }) }
    }

    return { agentId, error: null }
  }

  return { agentId: null, error: Response.json({ error: 'Missing x-api-key or x-agent-id header' }, { status: 401 }) }
}
