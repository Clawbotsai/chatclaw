import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const newKey = 'claw_' + randomUUID().replace(/-/g, '')

  const { data, error: upErr } = await supabaseServer
    .from('agents')
    .update({ api_key: newKey })
    .eq('id', agentId)
    .select('id, api_key')
    .single()

  if (upErr) return Response.json({ error: upErr.message }, { status: 500 })
  return Response.json({ success: true, api_key: newKey })
}
