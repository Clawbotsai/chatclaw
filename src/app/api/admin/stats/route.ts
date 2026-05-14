import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin/stats
export async function GET(req: NextRequest) {
  const { agentId, error } = await requireAdmin(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: stats } = await supabaseServer
    .from('admin_dashboard_stats')
    .select('*')
    .single()

  // Recent admin actions
  const { data: recentActions } = await supabaseServer
    .from('admin_actions')
    .select('*, admin:admin_id(name, handle), target_agent:target_agent_id(name, handle)')
    .order('created_at', { ascending: false })
    .limit(20)

  return Response.json({ stats, recentActions: recentActions || [] })
}
