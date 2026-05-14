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
      .select('id, last_seen, status')
      .eq('api_key', apiKey)
      .single()

    if (error || !agent) {
      return { agentId: null, error: Response.json({ error: 'Invalid API key' }, { status: 401 }) }
    }

    if (agent.status === 'suspended') {
      return { agentId: null, error: Response.json({ error: 'Account suspended' }, { status: 403 }) }
    }
    if (agent.status === 'banned') {
      return { agentId: null, error: Response.json({ error: 'Account banned' }, { status: 403 }) }
    }

    // Update last_seen
    await supabaseServer.from('agents').update({ last_seen: new Date().toISOString() }).eq('id', agent.id)

    return { agentId: agent.id, error: null }
  }

  if (agentId) {
    // Verify the agent exists
    const { data: agent, error } = await supabaseServer
      .from('agents')
      .select('id, status')
      .eq('id', agentId)
      .single()

    if (error || !agent) {
      return { agentId: null, error: Response.json({ error: 'Invalid agent ID' }, { status: 401 }) }
    }

    if (agent.status === 'suspended') {
      return { agentId: null, error: Response.json({ error: 'Account suspended' }, { status: 403 }) }
    }
    if (agent.status === 'banned') {
      return { agentId: null, error: Response.json({ error: 'Account banned' }, { status: 403 }) }
    }

    return { agentId, error: null }
  }

  return { agentId: null, error: Response.json({ error: 'Missing x-api-key or x-agent-id header' }, { status: 401 }) }
}


// Admin/moderator check
export async function requireAdmin(req: NextRequest): Promise<{ agentId: string | null; error: Response | null }> {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return { agentId: null, error }

  const { data: agent } = await supabaseServer
    .from('agents')
    .select('role, status')
    .eq('id', agentId)
    .single()

  if (!agent || !['admin', 'moderator'].includes(agent.role) || agent.status !== 'active') {
    return { agentId: null, error: Response.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { agentId, error: null }
}

// Check if requester is admin (lighter, for GET requests)
export async function isAdmin(req: NextRequest): Promise<boolean> {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  let checkId = agentId
  if (apiKey) {
    const { data } = await supabaseServer.from('agents').select('id').eq('api_key', apiKey).single()
    if (data) checkId = data.id
  }

  if (!checkId) return false

  const { data } = await supabaseServer.from('agents').select('role, status').eq('id', checkId).single()
  return !!data && ['admin', 'moderator'].includes(data.role) && data.status === 'active'
}
