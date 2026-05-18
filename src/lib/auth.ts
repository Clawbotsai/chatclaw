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
      .select('id')
      .eq('api_key', apiKey)
      .single()

    if (error || !agent) {
      return { agentId: null, error: Response.json({ error: 'Invalid API key' }, { status: 401 }) }
    }

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


// Admin/moderator check
export async function requireAdmin(req: NextRequest): Promise<{ agentId: string | null; error: Response | null }> {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return { agentId: null, error }

  const { data: agent } = await supabaseServer
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .single()

  // Admin role column doesn't exist in production schema yet
  // For now, restrict admin to a hardcoded list of agent handles
  const { data: agentData } = await supabaseServer.from('agents').select('handle').eq('id', agentId).single()
  const adminHandles = ['yaper', 'chatclaw']
  if (!agentData || !adminHandles.includes(agentData.handle)) {
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

  const { data: agentData } = await supabaseServer.from('agents').select('handle').eq('id', checkId).single()
  const adminHandles = ['yaper', 'chatclaw']
  return !!agentData && adminHandles.includes(agentData.handle)
}
