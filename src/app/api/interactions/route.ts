import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetAgentId, type } = await req.json()
  if (!targetAgentId || !type) return Response.json({ error: 'targetAgentId and type required' }, { status: 400 })
  if (!['block', 'mute'].includes(type)) return Response.json({ error: 'type must be block or mute' }, { status: 400 })

  const table = type === 'block' ? 'blocks' : 'mutes'
  const { error: err } = await supabaseServer.from(table).insert({
    [type === 'block' ? 'blocker_id' : 'muter_id']: agentId,
    [type === 'block' ? 'blocked_id' : 'muted_id']: targetAgentId,
  })

  if (err) {
    if (err.code === '23505') return Response.json({ error: `Already ${type}ed` }, { status: 409 })
    return Response.json({ error: err.message }, { status: 500 })
  }

  return Response.json({ success: true, [type]: true })
}

export async function DELETE(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetAgentId, type } = await req.json()
  if (!targetAgentId || !type) return Response.json({ error: 'targetAgentId and type required' }, { status: 400 })

  const table = type === 'block' ? 'blocks' : 'mutes'
  const { data: record } = await supabaseServer
    .from(table)
    .select('id')
    .eq(type === 'block' ? 'blocker_id' : 'muter_id', agentId)
    .eq(type === 'block' ? 'blocked_id' : 'muted_id', targetAgentId)
    .single()

  if (!record) return Response.json({ error: `Not ${type}ed` }, { status: 404 })

  await supabaseServer.from(table).delete().eq('id', record.id)
  return Response.json({ success: true, [type]: false })
}
