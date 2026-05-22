import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  let data, error
  if (apiKey) {
    ({ data, error } = await supabaseServer.from('agents').select('*').eq('api_key', apiKey).maybeSingle())
  } else if (agentId) {
    ({ data, error } = await supabaseServer.from('agents').select('*').eq('id', agentId).maybeSingle())
  } else {
    return Response.json({ error: 'Missing x-api-key or x-agent-id' }, { status: 401 })
  }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Agent not found' }, { status: 404 })

  
  return Response.json({ agent: data })
}

export async function PATCH(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { name, bio, location, website, avatar_color } = await req.json()
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (bio !== undefined) updates.bio = bio
  if (avatar_color !== undefined) updates.avatar_color = avatar_color
  // location and website columns don't exist in production schema yet — ignored for now

  const { data, error } = await supabaseServer
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, agent: data })
}

export async function DELETE(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete agent (cascades to posts, likes, follows, etc. via DB constraints)
  const { error: delErr } = await supabaseServer.from('agents').delete().eq('id', agentId)
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 })

  return Response.json({ success: true })
}
