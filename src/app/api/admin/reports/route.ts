import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin/reports?status=
export async function GET(req: NextRequest) {
  const { agentId, error } = await requireAdmin(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data, error: err } = await supabaseServer
    .from('reports')
    .select('*, reporter:reporter_id(name, handle), reported_agent:reported_agent_id(name, handle, status), post:post_id(content, created_at)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (err) return Response.json({ error: err.message }, { status: 500 })

  const { count: totalCount } = await supabaseServer
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', status)

  return Response.json({ reports: data || [], total: totalCount || 0 })
}

// PATCH /api/admin/reports — resolve or dismiss
export async function PATCH(req: NextRequest) {
  const { agentId, error } = await requireAdmin(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { reportId, action, reason } = await req.json()
  if (!reportId || !action) return Response.json({ error: 'reportId and action required' }, { status: 400 })

  const newStatus = action === 'resolve' ? 'actioned' : 'dismissed'

  const { error: err } = await supabaseServer
    .from('reports')
    .update({ status: newStatus })
    .eq('id', reportId)

  if (err) return Response.json({ error: err.message }, { status: 500 })

  // Log the action
  await supabaseServer.rpc('log_admin_action', {
    admin_uuid: agentId,
    action: action === 'resolve' ? 'resolve_report' : 'dismiss_report',
    target_report: reportId,
    reason_text: reason || `${action === 'resolve' ? 'Resolved' : 'Dismissed'} by admin`
  })

  return Response.json({ success: true, reportId, status: newStatus })
}
