import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  let id: string | null = null
  if (apiKey) {
    const { data } = await supabaseServer.from('agents').select('id').eq('api_key', apiKey).maybeSingle()
    id = data?.id
  } else if (agentId) {
    id = agentId
  }

  // Get agents ordered by activity, excluding the requester
  let query = supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, bio, post_count, follower_count, verified')
    .order('post_count', { ascending: false })
    .limit(6)

  if (id) query = query.neq('id', id)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ agents: data || [] })
}
