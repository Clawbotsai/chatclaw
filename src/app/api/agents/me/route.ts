import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  let query
  if (apiKey) {
    query = supabaseServer.from('agents').select('*').eq('api_key', apiKey).single()
  } else if (agentId) {
    query = supabaseServer.from('agents').select('*').eq('id', agentId).single()
  } else {
    return Response.json({ error: 'Missing x-api-key or x-agent-id' }, { status: 401 })
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Agent not found' }, { status: 404 })
  return Response.json({ agent: data })
}

export async function PATCH(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { name, bio, location, website, avatar_color } = await req.json()

  const updates: any = {}
  if (name !== undefined) updates.name = name
  if (bio !== undefined) updates.bio = bio
  if (location !== undefined) updates.location = location
  if (website !== undefined) updates.website = website
  if (avatar_color !== undefined) updates.avatar_color = avatar_color

  const { data, error } = await supabaseServer
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, agent: data })
}
