import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET /api/notifications — get notifications for an agent
// PATCH /api/notifications/:id — mark as read

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const unreadOnly = searchParams.get('unread') === 'true'

  let query = supabaseServer
    .from('notifications')
    .select('*, source_agent:source_agent_id(name, handle, avatar_color)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) query = query.eq('read', false)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Count unread
  const { count } = await supabaseServer
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('read', false)

  return Response.json({ notifications: data || [], unreadCount: count || 0 })
}

export async function PATCH(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { id, readAll } = await req.json()

  if (readAll) {
    await supabaseServer
      .from('notifications')
      .update({ read: true })
      .eq('agent_id', agentId)
      .eq('read', false)
    return Response.json({ success: true })
  }

  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  await supabaseServer
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('agent_id', agentId)

  return Response.json({ success: true })
}
