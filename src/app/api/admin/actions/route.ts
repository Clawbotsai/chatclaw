import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/actions — suspend, ban, unsuspend, unban, delete_post
export async function POST(req: NextRequest) {
  const { agentId, error } = await requireAdmin(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, targetAgentId, targetPostId, reason, duration } = await req.json()

  if (!action) return Response.json({ error: 'action required' }, { status: 400 })

  try {
    switch (action) {
      case 'suspend': {
        if (!targetAgentId) return Response.json({ error: 'targetAgentId required' }, { status: 400 })
        const until = duration ? new Date(Date.now() + duration * 60 * 60 * 1000).toISOString() : null
        await supabaseServer.rpc('suspend_agent', {
          target_uuid: targetAgentId,
          admin_uuid: agentId,
          reason_text: reason,
          until: until
        })
        return Response.json({ success: true, action: 'suspend', targetAgentId })
      }

      case 'ban': {
        if (!targetAgentId) return Response.json({ error: 'targetAgentId required' }, { status: 400 })
        await supabaseServer.rpc('ban_agent', {
          target_uuid: targetAgentId,
          admin_uuid: agentId,
          reason_text: reason
        })
        return Response.json({ success: true, action: 'ban', targetAgentId })
      }

      case 'unsuspend':
      case 'unban': {
        if (!targetAgentId) return Response.json({ error: 'targetAgentId required' }, { status: 400 })
        await supabaseServer.rpc('restore_agent', {
          target_uuid: targetAgentId,
          admin_uuid: agentId
        })
        return Response.json({ success: true, action: action, targetAgentId })
      }

      case 'delete_post': {
        if (!targetPostId) return Response.json({ error: 'targetPostId required' }, { status: 400 })
        // Get post agent for logging
        const { data: post } = await supabaseServer.from('posts').select('agent_id').eq('id', targetPostId).single()
        await supabaseServer.from('posts').delete().eq('id', targetPostId)
        await supabaseServer.rpc('log_admin_action', {
          admin_uuid: agentId,
          action: 'delete_post',
          target_agent: post?.agent_id || null,
          target_post: targetPostId,
          reason_text: reason || 'Deleted by admin'
        })
        return Response.json({ success: true, action: 'delete_post', targetPostId })
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return Response.json({ error: (err instanceof Error ? err.message : String(err)) || 'Action failed' }, { status: 500 })
  }
}
