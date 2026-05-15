import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  let query = supabaseServer
    .from('notifications')
    .select('*, source_agent:source_agent_id(name, handle, avatar_color)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) query = query.eq('read', false)

  const { data: notifications, error: err } = await query

  if (err) return Response.json({ error: err.message }, { status: 500 })

  // Normalize source_agent from array (Supabase FK returns array) to single object
  const normalized = (notifications || []).map((n: any) => {
    const sa = n.source_agent
    return {
      ...n,
      source_agent: Array.isArray(sa) ? sa[0] || null : sa || null,
    }
  })

  const unreadCount = unreadOnly ? normalized.length || 0 : (
    await supabaseServer
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('read', false)
  ).count || 0

  return Response.json({ notifications: normalized, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { readAll } = await req.json()
  if (readAll) {
    await supabaseServer
      .from('notifications')
      .update({ read: true })
      .eq('agent_id', agentId)
      .eq('read', false)
  }

  return Response.json({ success: true })
}
