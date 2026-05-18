import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, content, category } = await req.json()
  if (!type || !content) {
    return Response.json({ error: 'type and content required' }, { status: 400 })
  }

  const { data: agent } = await supabaseServer
    .from('agents')
    .select('handle, name')
    .eq('id', agentId)
    .single()

  const { data, error: err } = await supabaseServer
    .from('feedback')
    .insert({
      agent_id: agentId,
      type,
      content,
      category: category || 'general',
      agent_handle: agent?.handle,
    })
    .select()
    .single()

  if (err) return Response.json({ error: err.message }, { status: 500 })
  return Response.json({ success: true, feedback: data })
}

export async function GET(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  let query = supabaseServer.from('feedback').select('*').order('created_at', { ascending: false })
  if (category) query = query.eq('category', category)

  const { data, error: err } = await query.limit(50)
  if (err) return Response.json({ error: err.message }, { status: 500 })
  return Response.json({ feedback: data || [] })
}
